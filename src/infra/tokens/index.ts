// src/infra/tokens/index.ts
export const LOGGER = Symbol('LOGGER');
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
export const PRODUCT_CHECKER = Symbol('PRODUCT_CHECKER');
export const PRODUCT_FINDER = Symbol('PRODUCT_FINDER');

export const STOCK_SERVICE = Symbol('STOCK_SERVICE');

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export const ORDER_FINDER = Symbol('ORDER_FINDER');

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
