#!/usr/bin/env python3
"""
AUTOLOGIC — Full evaluation of distilled model against 15 propositional exercises.
Tests the model via Ollama API and reports accuracy.
"""
import json, sys, requests, time

OLLAMA_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:11434/api/chat"
MODEL = sys.argv[2] if len(sys.argv) > 2 else "autologic-formalizer-3b"

SYSTEM_PROMPT = """You are Autologic's semantic AST parser.
Your goal is to read complex human text and translate it into Situated Propositional Logic or bounded First-Order Logic depending on the profile: 'classical.propositional'.
DO NOT try to resolve or prove the logic. Only extract the claims and their semantic relations.
AVOID deep First-Order combinatorial explosions. Collapse contextual instances into descriptive propositional atoms like: 'CumpleInformesOrdinarios'.

You MUST return a pure JSON object conforming exactly to this interface, nothing else:
{
  "axioms": [ { "name": "a1", "formulaJSON": <LogicNode> }, ... ],
  "conclusions": [ { "formulaJSON": <LogicNode> } ]
}

Available LogicNode types for formulaJSON:
- AtomNode: { "type": "Atom", "id": "SCREAMING_SNAKE_CASE_ID", "text": "human readable description" }
- ConnectiveNode: { "type": "Connective", "operator": "AND"|"OR"|"IMPLIES"|"IFF"|"NOT", "left": <node>, "right": <node> }
  For NOT: { "type": "Connective", "operator": "NOT", "left": <child_node> }
- ModalNode: { "type": "Modal", "operator": "K"|"B"|"O"|"P"|"F"|"BOX"|"DIA"|"ALWAYS"|"EVENTUALLY"|"NEXT", "child": <node>, "agent": "optional" }
- QuantifierNode: { "type": "Quantifier", "operator": "FORALL"|"EXISTS", "variables": ["x"], "child": <node> }
- PredicateNode: { "type": "Predicate", "name": "P", "args": [{"type":"Object","name":"x"}] }

Rules:
- axioms = premises and rules that are assumed true
- conclusions = what should be derived from axioms
- Use the SAME Atom id across axioms/conclusions when referring to the same proposition
- Atom ids must be SCREAMING_SNAKE_CASE
- Be precise. Return ONLY the raw JSON object. No markdown, no codeblocks."""

# 15 exercises from the test suite with expected patterns
EXERCISES = [
    {
        "text": "Si llueve, entonces la calle se moja. Llueve. Por lo tanto, la calle se moja.",
        "pattern": "modus_ponens",
        "expect_axioms": 2,
        "expect_conclusions": 1,
        "expect_operators": ["IMPLIES"],
    },
    {
        "text": "Si la policía patrulla las calles, entonces no hay delincuentes al acecho. Pero o bien hay delincuentes al acecho o sujetos ebrios fomentando el desorden. La policía patrulla las calles. Luego, hay sujetos ebrios fomentando el desorden.",
        "pattern": "disjunctive_syllogism",
        "expect_axioms": 3,
        "expect_conclusions": 1,
        "expect_operators": ["IMPLIES", "NOT", "OR"],
    },
    {
        "text": "Si estudio, entonces apruebo el examen. No aprobé el examen. Por lo tanto, no estudié.",
        "pattern": "modus_tollens",
        "expect_axioms": 2,
        "expect_conclusions": 1,
        "expect_operators": ["IMPLIES", "NOT"],
    },
    {
        "text": "Todo mamífero es vertebrado. Todo perro es mamífero. Por lo tanto, todo perro es vertebrado.",
        "pattern": "hypothetical_syllogism",
        "expect_axioms": 2,
        "expect_conclusions": 1,
        "expect_operators": ["IMPLIES"],
    },
    {
        "text": "O llueve o hace sol. No llueve. Por lo tanto, hace sol.",
        "pattern": "disjunctive_syllogism_simple",
        "expect_axioms": 2,
        "expect_conclusions": 1,
        "expect_operators": ["OR", "NOT"],
    },
    {
        "text": "Si el contrato es válido, entonces las partes están obligadas. Si las partes están obligadas, entonces deben cumplir. El contrato es válido. Luego, las partes deben cumplir.",
        "pattern": "chain_modus_ponens",
        "expect_axioms": 3,
        "expect_conclusions": 1,
        "expect_operators": ["IMPLIES"],
    },
    {
        "text": "Una persona es culpable si y solo si cometió el delito. Juan no cometió el delito. Luego, Juan no es culpable.",
        "pattern": "biconditional_elimination",
        "expect_axioms": 2,
        "expect_conclusions": 1,
        "expect_operators": ["IFF", "NOT"],
    },
    {
        "text": "Toda norma jurídica es válida si y solo si ha sido promulgada por la autoridad competente. Esta norma no ha sido promulgada por la autoridad competente. Luego, esta norma jurídica no es válida.",
        "pattern": "biconditional_tollens",
        "expect_axioms": 2,
        "expect_conclusions": 1,
        "expect_operators": ["IFF", "NOT"],
    },
    {
        "text": "Si el acusado confiesa, entonces se reduce la pena. Si no confiesa, entonces el juicio continúa. El acusado confiesa o no confiesa. Luego, se reduce la pena o el juicio continúa.",
        "pattern": "constructive_dilemma",
        "expect_axioms": 3,
        "expect_conclusions": 1,
        "expect_operators": ["IMPLIES", "OR", "NOT"],
    },
    {
        "text": "La Tierra gira alrededor del Sol y la Luna gira alrededor de la Tierra. Luego, la Tierra gira alrededor del Sol.",
        "pattern": "conjunction_elimination",
        "expect_axioms": 1,
        "expect_conclusions": 1,
        "expect_operators": ["AND"],
    },
    {
        "text": "Los estudiantes asisten a clase. Los profesores preparan material. Luego, los estudiantes asisten a clase y los profesores preparan material.",
        "pattern": "conjunction_introduction",
        "expect_axioms": 2,
        "expect_conclusions": 1,
        "expect_operators": ["AND"],
    },
    {
        "text": "Si un ciudadano paga impuestos, entonces tiene derecho a servicios públicos. María es ciudadana y paga impuestos. Luego, María tiene derecho a servicios públicos.",
        "pattern": "universal_instantiation",
        "expect_axioms": 2,
        "expect_conclusions": 1,
        "expect_operators": ["IMPLIES", "AND"],
    },
    {
        "text": "Si hace frío y no tengo abrigo, entonces me resfriaré. Hace frío. No tengo abrigo. Luego, me resfriaré.",
        "pattern": "modus_ponens_compound",
        "expect_axioms": 3,
        "expect_conclusions": 1,
        "expect_operators": ["IMPLIES", "AND", "NOT"],
    },
    {
        "text": "Si el testigo miente, entonces es culpable de perjurio. Si es culpable de perjurio, entonces irá a prisión. El testigo no irá a prisión. Luego, el testigo no mintió.",
        "pattern": "chain_modus_tollens",
        "expect_axioms": 3,
        "expect_conclusions": 1,
        "expect_operators": ["IMPLIES", "NOT"],
    },
    {
        "text": "Si la empresa obtiene ganancias, entonces repartirá dividendos a los accionistas. La empresa no repartirá dividendos a los accionistas. Luego, la empresa no obtuvo ganancias.",
        "pattern": "modus_tollens_2",
        "expect_axioms": 2,
        "expect_conclusions": 1,
        "expect_operators": ["IMPLIES", "NOT"],
    },
]


def extract_operators(node, ops=None):
    """Recursively extract all operators from an AST node."""
    if ops is None:
        ops = set()
    if isinstance(node, dict):
        if node.get("type") == "Connective":
            ops.add(node.get("operator", ""))
        for v in node.values():
            extract_operators(v, ops)
    elif isinstance(node, list):
        for item in node:
            extract_operators(item, ops)
    return ops


def evaluate(exercise, content):
    """Score a response against expectations. Returns (score 0-5, details)."""
    score = 0
    details = []

    # 1. Valid JSON?
    try:
        parsed = json.loads(content)
    except:
        return 0, ["❌ Not valid JSON"]

    score += 1
    details.append("✅ Valid JSON")

    # 2. Has axioms and conclusions arrays?
    axioms = parsed.get("axioms", [])
    conclusions = parsed.get("conclusions", [])
    if not isinstance(axioms, list) or not isinstance(conclusions, list):
        return score, details + ["❌ axioms/conclusions not arrays"]

    if len(axioms) > 0 and len(conclusions) > 0:
        score += 1
        details.append(f"✅ Structure: {len(axioms)} axioms, {len(conclusions)} conclusions")
    else:
        details.append(f"⚠️  axioms={len(axioms)} conclusions={len(conclusions)}")

    # 3. Correct number of axioms?
    if len(axioms) == exercise["expect_axioms"]:
        score += 1
        details.append(f"✅ Axiom count correct ({len(axioms)})")
    else:
        details.append(f"⚠️  Axiom count: got {len(axioms)}, expected {exercise['expect_axioms']}")

    # 4. Correct number of conclusions?
    if len(conclusions) == exercise["expect_conclusions"]:
        score += 0.5
    else:
        details.append(f"⚠️  Conclusion count: got {len(conclusions)}, expected {exercise['expect_conclusions']}")

    # 5. Uses correct operators?
    all_ops = set()
    for ax in axioms:
        extract_operators(ax.get("formulaJSON", {}), all_ops)
    for c in conclusions:
        extract_operators(c.get("formulaJSON", {}), all_ops)

    expected_ops = set(exercise["expect_operators"])
    found = expected_ops & all_ops
    if found == expected_ops:
        score += 1.5
        details.append(f"✅ Operators correct: {found}")
    elif len(found) > 0:
        score += 0.5
        details.append(f"⚠️  Operators partial: found {found}, expected {expected_ops}")
    else:
        details.append(f"❌ Operators missing: found {all_ops}, expected {expected_ops}")

    # 6. Atom IDs are SCREAMING_SNAKE_CASE?
    def check_atoms(node):
        if isinstance(node, dict):
            if node.get("type") == "Atom":
                aid = node.get("id", "")
                return aid == aid.upper() and "_" in aid or aid == aid.upper()
            return all(check_atoms(v) for v in node.values())
        if isinstance(node, list):
            return all(check_atoms(i) for i in node)
        return True

    all_screaming = all(
        check_atoms(ax.get("formulaJSON", {})) for ax in axioms
    ) and all(
        check_atoms(c.get("formulaJSON", {})) for c in conclusions
    )
    if all_screaming:
        details.append("✅ SCREAMING_SNAKE_CASE IDs")
    else:
        details.append("⚠️  Some IDs not SCREAMING_SNAKE_CASE")

    return score, details


def main():
    print(f"Model: {MODEL}")
    print(f"URL:   {OLLAMA_URL}")
    print(f"Tests: {len(EXERCISES)}")
    print("=" * 70)

    total_score = 0
    max_score = len(EXERCISES) * 5
    passed = 0

    for i, ex in enumerate(EXERCISES):
        print(f"\n[{i+1}/{len(EXERCISES)}] {ex['pattern']}")
        print(f"  Text: {ex['text'][:80]}...")

        try:
            t0 = time.time()
            resp = requests.post(OLLAMA_URL, json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Formalize this text:\n\n{ex['text']}"}
                ],
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.1},
            }, timeout=120)
            elapsed = time.time() - t0

            data = resp.json()
            content = data.get("message", {}).get("content", "")
            score, details = evaluate(ex, content)
            total_score += score

            status = "✅ PASS" if score >= 4 else ("⚠️  PARTIAL" if score >= 2 else "❌ FAIL")
            if score >= 4:
                passed += 1

            print(f"  {status} (score: {score}/5, {elapsed:.1f}s)")
            for d in details:
                print(f"    {d}")

        except Exception as e:
            print(f"  ❌ ERROR: {e}")

    print("\n" + "=" * 70)
    print(f"RESULTS: {passed}/{len(EXERCISES)} passed (score≥4)")
    print(f"TOTAL SCORE: {total_score:.1f}/{max_score} ({total_score/max_score*100:.0f}%)")

    if passed >= 12:
        print("🎯 EXCELLENT — ready for production")
    elif passed >= 8:
        print("👍 GOOD — usable with some limitations")
    elif passed >= 5:
        print("⚠️  FAIR — needs improvement")
    else:
        print("❌ POOR — needs significant retraining")


if __name__ == "__main__":
    main()
