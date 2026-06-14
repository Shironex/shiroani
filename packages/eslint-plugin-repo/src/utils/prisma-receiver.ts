import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';

/**
 * Shared receiver-shape helpers for the tenant-isolation lint rules.
 *
 * With no row-level security, the only thing that keeps one tenant from reading
 * another's rows is (a) the Prisma `$extends` tenant-scope extension and (b)
 * these lint rules. A rule that matches only the literal `this.prisma.unscoped.x`
 * shape is trivially bypassed by binding the unscoped client to a local first
 * (`const { unscoped } = this.prismaService; unscoped.firma.findMany(...)`), so
 * the helpers here resolve a bare-identifier receiver back through its binding to
 * detect that the chain ultimately reaches the unscoped client.
 *
 * This is name/shape matching with no type information: it raises the bar against
 * the common evasions (destructure, single-hop alias) but cannot follow a client
 * laundered through a function return (`getDb()`). Only RLS is a complete
 * backstop; these rules are the static layer in front of it.
 */

const PRISMA_PATTERN = /prisma/i;
const UNSCOPED_PROPERTY = 'unscoped';

/** A non-computed `.<name>` member access whose property name matches. */
export function isMemberNamed(node: TSESTree.Node, name: string): boolean {
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === name
  );
}

/**
 * True when `node` looks like a Prisma-ish receiver: a bare identifier whose name
 * matches /prisma/i (e.g. `prisma`, `prismaService`) or a non-computed member
 * access whose property name matches (e.g. `this.prisma`, `app.prismaService`).
 */
export function isPrismaLikeReceiver(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return PRISMA_PATTERN.test(node.name);
  }
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier
  ) {
    return PRISMA_PATTERN.test(node.property.name);
  }
  return false;
}

/** True when an ObjectPattern binds the `unscoped` property (`{ unscoped }` or `{ unscoped: alias }`). */
function objectPatternBindsUnscoped(pattern: TSESTree.ObjectPattern): boolean {
  return pattern.properties.some(
    prop =>
      prop.type === AST_NODE_TYPES.Property &&
      !prop.computed &&
      prop.key.type === AST_NODE_TYPES.Identifier &&
      prop.key.name === UNSCOPED_PROPERTY
  );
}

/**
 * True when `declarator` pulls the unscoped client out of a prisma-like object
 * via destructuring: `const { unscoped } = this.prismaService` (or aliased
 * `const { unscoped: raw } = ...`). This is the binding-site evasion the
 * member-access matchers miss, so the no-unscoped rule flags it here directly.
 */
export function isUnscopedDestructure(declarator: TSESTree.VariableDeclarator): boolean {
  return (
    declarator.id.type === AST_NODE_TYPES.ObjectPattern &&
    declarator.init !== null &&
    isPrismaLikeReceiver(declarator.init) &&
    objectPatternBindsUnscoped(declarator.id)
  );
}

/** True when a variable declarator's initializer is `<prisma-like>.unscoped`. */
function initializerIsUnscopedMember(init: TSESTree.Expression | null): boolean {
  return (
    init !== null &&
    init.type === AST_NODE_TYPES.MemberExpression &&
    isMemberNamed(init, UNSCOPED_PROPERTY) &&
    isPrismaLikeReceiver(init.object)
  );
}

/**
 * Resolve a bare identifier through its declaration and report whether it was
 * bound to the unscoped client, either by member access (`const u =
 * prismaSvc.unscoped`) or by destructuring (`const { unscoped: u } = prismaSvc`).
 */
function identifierResolvesToUnscoped(
  identifier: TSESTree.Identifier,
  scope: TSESLint.Scope.Scope
): boolean {
  const variable = ASTUtils.findVariable(scope, identifier);
  if (variable === null) {
    return false;
  }
  return variable.defs.some(def => {
    if (def.node.type !== AST_NODE_TYPES.VariableDeclarator) {
      return false;
    }
    if (initializerIsUnscopedMember(def.node.init)) {
      return true;
    }
    return (
      def.node.id.type === AST_NODE_TYPES.ObjectPattern &&
      def.node.init !== null &&
      isPrismaLikeReceiver(def.node.init) &&
      objectPatternBindsUnscoped(def.node.id)
    );
  });
}

/**
 * True when a receiver chain reaches the unscoped client: directly (any
 * `.unscoped` member in the chain, e.g. `this.prisma.unscoped.firma`) or via a
 * bare-identifier root resolved back to an `unscoped` binding (e.g.
 * `const { unscoped } = svc; unscoped.firma` -> the chain root `unscoped`
 * resolves to a destructure of `svc.unscoped`).
 */
export function chainResolvesToUnscoped(node: TSESTree.Node, scope: TSESLint.Scope.Scope): boolean {
  let current: TSESTree.Node | undefined = node;
  while (current && current.type === AST_NODE_TYPES.MemberExpression) {
    if (isMemberNamed(current, UNSCOPED_PROPERTY)) {
      return true;
    }
    current = current.object;
  }
  if (current && current.type === AST_NODE_TYPES.Identifier) {
    return identifierResolvesToUnscoped(current, scope);
  }
  return false;
}
