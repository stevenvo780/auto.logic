export type LogicOperation =
  | 'AND'
  | 'OR'
  | 'IMPLIES'
  | 'IFF'
  | 'NOT';

export type QuantifierType = 'FORALL' | 'EXISTS' | 'EXACTLY_N';

export type ModalOperator =
  | 'K' // Knowledge
  | 'B' // Belief
  | 'O' // Obligation
  | 'P' // Permission
  | 'F' // Forbidden
  | 'BOX' // Necessity
  | 'DIA' // Possibility
  | 'ALWAYS' // Temporal G
  | 'EVENTUALLY' // Temporal F
  | 'NEXT'; // Temporal X

export type TemporalBinaryOp = 'UNTIL';

export type MathOp = 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'MOD' | 'EQ' | 'NEQ' | 'LT' | 'GT' | 'LTE' | 'GTE';

export interface BaseNode {
  type: string;
}

export interface AtomNode extends BaseNode {
  type: 'Atom';
  id: string; // ST Atom ID, ej: COMPILAR_CODIGO
  text: string; // Original text for ST interpret
}

export interface ConnectiveNode extends BaseNode {
  type: 'Connective';
  operator: LogicOperation;
  left: LogicNode;
  right?: LogicNode; // For NOT, right is undefined or we use NegationNode
}

export interface QuantifierNode extends BaseNode {
  type: 'Quantifier';
  operator: QuantifierType;
  variables: string[];
  exactCount?: number; // Para EXISTS_EXACTLY_N
  child: LogicNode;
}

export interface ModalNode extends BaseNode {
  type: 'Modal';
  operator: ModalOperator;
  agent?: string; // Para lógicas multi-agentes (ej: K_Diego)
  child: LogicNode;
}

export interface TemporalNode extends BaseNode {
  type: 'TemporalBinary';
  operator: TemporalBinaryOp;
  left: LogicNode;
  right: LogicNode;
}

export interface PredicateNode extends BaseNode {
  type: 'Predicate';
  name: string;
  args: LogicNode[];
}

export interface ObjectNode extends BaseNode {
  type: 'Object';
  name: string; // P.ej. "x", "Diego", "2"
}

export interface MathNode extends BaseNode {
  type: 'Math';
  operator: MathOp;
  left: LogicNode;
  right: LogicNode;
}

export interface ProbabilityNode extends BaseNode {
  type: 'Probability';
  value: number; // 0.0 to 1.0
  child: LogicNode;
}

export interface RefNode extends BaseNode {
  type: 'Ref';
  targetId: string; // Para DRT Anafórico
}

export type LogicNode =
  | AtomNode
  | ConnectiveNode
  | QuantifierNode
  | ModalNode
  | TemporalNode
  | PredicateNode
  | ObjectNode
  | MathNode
  | ProbabilityNode
  | RefNode;

// Helper Factories
export const AST = {
  atom(id: string, text: string): AtomNode {
    return { type: 'Atom', id, text };
  },
  and(left: LogicNode, right: LogicNode): ConnectiveNode {
    return { type: 'Connective', operator: 'AND', left, right };
  },
  or(left: LogicNode, right: LogicNode): ConnectiveNode {
    return { type: 'Connective', operator: 'OR', left, right };
  },
  implies(left: LogicNode, right: LogicNode): ConnectiveNode {
    return { type: 'Connective', operator: 'IMPLIES', left, right };
  },
  not(child: LogicNode): ConnectiveNode {
    return { type: 'Connective', operator: 'NOT', left: child };
  },
  forall(variables: string[], child: LogicNode): QuantifierNode {
    return { type: 'Quantifier', operator: 'FORALL', variables, child };
  },
  exists(variables: string[], child: LogicNode): QuantifierNode {
    return { type: 'Quantifier', operator: 'EXISTS', variables, child };
  },
  exactlyN(variables: string[], count: number, child: LogicNode): QuantifierNode {
    return { type: 'Quantifier', operator: 'EXACTLY_N', variables, exactCount: count, child };
  },
  modal(operator: ModalOperator, child: LogicNode, agent?: string): ModalNode {
    return { type: 'Modal', operator, agent, child };
  },
  temporalUntil(left: LogicNode, right: LogicNode): TemporalNode {
    return { type: 'TemporalBinary', operator: 'UNTIL', left, right };
  },
  predicate(name: string, args: LogicNode[]): PredicateNode {
    return { type: 'Predicate', name, args };
  },
  obj(name: string): ObjectNode {
    return { type: 'Object', name };
  },
  math(operator: MathOp, left: LogicNode, right: LogicNode): MathNode {
    return { type: 'Math', operator, left, right };
  },
  probability(value: number, child: LogicNode): ProbabilityNode {
    return { type: 'Probability', value, child };
  },
  ref(targetId: string): RefNode {
    return { type: 'Ref', targetId };
  }
};
