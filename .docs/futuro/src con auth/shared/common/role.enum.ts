export enum typeRole {
    GUEST = 'GUEST',
    AGENTE = 'AGENTE',             // Vende seguros
    SUPERVISOR = 'SUPERVISOR',     // Supervisa agentes  
    ADMIN = 'ADMIN',               // Gestión sistema
    SUPER_ADMIN = 'SUPER_ADMIN'    // Control total
}


type Role = "admin" | "user" | "guest"
const permissions: Record<Role, string[]> = {
    admin: ["read", "write", "delete"],
    user: ["read", "write"],
    guest: ["read"]
}


// C (Create):
// ADMIN y SUPER_ADMIN → pueden crear usuarios (ej: dar de alta un agente o supervisor).
// SUPERVISOR → podría crear solo agentes (si querés delegar gestión parcial).
// AGENTE → nunca crea otros usuarios.

// R (Read):
// ADMIN y SUPER_ADMIN → ver todos los usuarios.
// SUPERVISOR → ver sus agentes.
// AGENTE → ver solo su propio perfil.

// U (Update):
// SUPER_ADMIN → cualquier usuario.
// ADMIN → usuarios menos SUPER_ADMIN.
// SUPERVISOR → actualizar solo agentes bajo su supervisión.
// AGENTE → actualizar solo su perfil (ej: datos de contacto, no rol).

// D (Delete):
// SUPER_ADMIN → cualquiera.
// ADMIN → todos menos SUPER_ADMIN.
// SUPERVISOR → solo sus agentes.
// AGENTE → ninguno.
// ______________________

// INTERNO  !!!!!!!!!!!!!!!1

// Module USER 

// SUPER_ADMIN seed : solo uno o dos
// SUPER_ADMIN puede crear ADMIN, SUPERVISOR y AGENTE.

// ADMIN crea SUPERVISOR y AGENTE

// SUPERVISOR crea AGENTE y GUEST

// AGENTE crea GUEST

// Module Auth

// Login : todos !!!!

// ____________________


// EXTERNO  !!!!!!!!!!!!!!!1

// REGISTER: GUEST , rol fijo