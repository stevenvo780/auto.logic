// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: classical.propositional
// Idioma: es
// Patrones: ast_compiled
// ═══════════════════════════════════════

logic classical.propositional

// ── Estructura argumental ─────────────
// Patrón detectado: ast_compiled

axiom a1 = CumpleInformesOrdinarios & InformesDistintos & !InformesIncompatibles & !DeteccionPlagio -> DictamenFavorable
axiom a2 = DictamenFavorable -> !DeteccionPlagio -> PasaProgramacionEditorial
axiom a3 = CumpleInformesOrdinarios
axiom a4 = InformesDistintos
axiom a5 = !InformesIncompatibles
axiom a6 = !DeteccionPlagio
derive PasaProgramacionEditorial from {a1, a2, a3, a4, a5, a6}
