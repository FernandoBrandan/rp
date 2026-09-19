// src/infra/tokens/index.ts

export const LOGGER = Symbol('LOGGER');
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const JWT_SERVICE = Symbol('JWT_SERVICE');
export const HASH_SERVICE = Symbol('HASH_SERVICE');

// ---------------------------------------------------------------------------------

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const USER_FINDER = Symbol('USER_FINDER');

// ---------------------------------------------------------------------------------

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
export const PRODUCT_CHECKER = Symbol('PRODUCT_CHECKER');
export const PRODUCT_FINDER = Symbol('PRODUCT_FINDER');

export const STOCK_SERVICE = Symbol('STOCK_SERVICE');

// ---------------------------------------------------------------------------------

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');

// ---------------------------------------------------------------------------------

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export const ORDER_FINDER = Symbol('ORDER_FINDER');
export const ORDER_PAYMENT_STATUS = Symbol('ORDER_PAYMENT_STATUS');

// ---------------------------------------------------------------------------------

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
