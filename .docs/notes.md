# Notas personales — proceso de diseño

Estas notas NO son spec. Son el proceso mental detrás de las decisiones.
Sirven para:

- Escribir un blog post técnico después
- Volver a pensar lo mismo cuando encare el próximo proyecto
- Documentar dudas abiertas

---

## Preguntas de resiliencia

Cuando diseñes un BC, preguntate:

- ¿Qué pasa si el servicio de pago tarda 10 segundos?
- ¿Qué pasa si el mensaje se duplica?
- ¿Qué pasa si el inventario se vuelve negativo?
- ¿Qué pasa si el proceso crashea entre dos escrituras?
- ¿Qué pasa si dos requests concurrentes pegan al mismo recurso?
- ¿Qué pasa si un webhook llega antes de que exista la orden?
- ¿Qué pasa si un webhook llega tarde (ya cancelada la orden)?
- ¿Qué pasa si el proveedor externo está caído 5 minutos?
- ¿Qué pasa si el usuario cierra el navegador a mitad del pago?

Cada pregunta que tenga una respuesta no trivial → candidata a ADR.

---

## Por qué esta sección no va a docs/

Porque no responde "¿qué es el sistema?" ni "¿por qué X?". Es un checklist
mental para MI proceso de diseño. Cambia con cada proyecto.

## Despues

### Documentación técnica

No README bonito.
Documento de diseño:

- Diagrama modular (C4)
- Trade-offs tomados (por qué monolito modular y no microservicios)
- Consistencia: cómo se garantiza
- Resiliencia: qué patrones y por qué
- Observabilidad: qué metría se recolecta y para qué sirve
