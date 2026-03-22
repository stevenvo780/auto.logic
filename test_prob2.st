logic probabilistic.basic
axiom a1 = FRAUDE -> (Pr(ALERTA) = 0.93)
axiom a2 = FRAUDE
derive Pr(ALERTA) = 0.93 from {a1, a2}
