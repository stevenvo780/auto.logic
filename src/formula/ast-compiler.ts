import { LogicNode } from './ast';

/**
 * Compiles an AST Node into valid ST source code syntax.
 */
export function compileAST(node: LogicNode): string {
  switch (node.type) {
    case 'Atom':
      return node.id;
    case 'Object':
      return node.name;
    case 'Predicate':
      return `${node.name}(${node.args.map(compileAST).join(', ')})`;
    case 'Connective': {
      const left = compileAST(node.left);
      if (node.operator === 'NOT') {
        const inner = node.left.type === 'Connective' || node.left.type === 'Quantifier' ? `(${left})` : left;
        return `!${inner}`;
      }
      const right = compileAST(node.right!);
      switch (node.operator) {
        case 'AND': return `${left} & ${right}`;
        case 'OR': return `${left} | ${right}`;
        case 'IMPLIES': return `${left} -> ${right}`;
        case 'IFF': return `${left} <-> ${right}`;
      }
    }
    case 'Quantifier': {
      const vars = node.variables;
      const child = compileAST(node.child);
      if (node.operator === 'FORALL') {
        return vars.reduceRight((acc, v) => `forall ${v} (${acc})`, child);
      } else if (node.operator === 'EXISTS') {
        return vars.reduceRight((acc, v) => `exists ${v} (${acc})`, child);
      } else if (node.operator === 'EXACTLY_N') {
        const n = node.exactCount!;
        const conditions: string[] = [];
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            conditions.push(`(${node.variables[i]} != ${node.variables[j]})`);
          }
        }
        let inside = `${child}`;
        if (conditions.length > 0) {
          inside = `${inside} & ${conditions.join(' & ')}`;
        }
        return `exists ${vars} (${inside})`; 
      }
      return '';
    }
    case 'Modal': {
      const child = compileAST(node.child);
      const inner = node.child.type === 'Connective' ? `(${child})` : child;
      switch(node.operator) {
        case 'K': return node.agent ? `K_${node.agent}(${inner})` : `K(${inner})`;
        case 'B': return node.agent ? `B_${node.agent}(${inner})` : `B(${inner})`;
        case 'O': return `O(${inner})`;
        case 'P': return `P(${inner})`;
        case 'F': return `F(${inner})`;
        case 'BOX': return `box(${inner})`;
        case 'DIA': return `dia(${inner})`;
        case 'ALWAYS': return `G(${inner})`;
        case 'EVENTUALLY': return `F_temp(${inner})`; 
        case 'NEXT': return `X(${inner})`;
      }
      return child; 
    }
    case 'TemporalBinary': {
      const left = compileAST(node.left);
      const right = compileAST(node.right);
      if (node.operator === 'UNTIL') return `${left} U ${right}`;
      return '';
    }
    case 'Math': {
      const left = compileAST(node.left);
      const right = compileAST(node.right);
      switch(node.operator) {
        case 'ADD': return `Addition(${left}, ${right})`;
        case 'SUB': return `Subtraction(${left}, ${right})`;
        case 'MUL': return `Multiplication(${left}, ${right})`;
        case 'DIV': return `Division(${left}, ${right})`;
        case 'MOD': return `Modulo(${left}, ${right})`;
        case 'EQ': return `${left} = ${right}`;
        case 'NEQ': return `${left} != ${right}`;
        case 'LT': return `${left} < ${right}`;
        case 'LTE': return `${left} <= ${right}`;
        case 'GT': return `${left} > ${right}`;
        case 'GTE': return `${left} >= ${right}`;
      }
    }
    case 'Probability': {
      const child = compileAST(node.child);
      return `Pr(${child}) = ${node.value}`;
    }
    case 'Ref': {
      return `REF_${node.targetId}`; 
    }
  }
  return '';
}
