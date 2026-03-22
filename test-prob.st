logic probabilistic.basic

axiom a1 = Pr(FRAUDE) = 0.02
axiom a2 = Pr(ALERTA | FRAUDE) = 0.93
axiom a3 = Pr(ALERTA | !FRAUDE) = 0.04

check valid Pr(FRAUDE | ALERTA) = 0.7915
