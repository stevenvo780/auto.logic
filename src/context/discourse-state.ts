import { LogicNode } from '../formula/ast';

export class DiscourseState {
  private prevStates = new Map<string, LogicNode>();
  private statementCounter = 1;

  registerStatement(node: LogicNode): string {
    const id = `s${this.statementCounter++}`;
    this.prevStates.set(id, node);
    return id;
  }

  getLastStatementId(): string | undefined {
    if (this.statementCounter === 1) return undefined;
    return `s${this.statementCounter - 1}`;
  }

  resolvePronoun(pronoun: string): string | undefined {
    if (pronoun.toLowerCase() === 'esto' || pronoun.toLowerCase() === 'lo' || pronoun.toLowerCase() === 'lo anterior') {
      return this.getLastStatementId();
    }
    return undefined;
  }
}

export const globalDrt = new DiscourseState();
