/**
 * services/paymentGateway.js — Payment Gateway Factory & Resolution
 *
 * Implements the Factory Pattern to instantiate and return concrete
 * PaymentProvider strategies based on runtime configuration or explicit selection.
 * Decouples the application layer from specific gateway SDKs.
 */

import StripeProvider from './providers/stripeProvider.js';
import MockProvider from './providers/mockProvider.js';

// Provider registry mapping provider identifiers to provider constructors
const providerRegistry = {
  stripe: StripeProvider,
  mock: MockProvider,
};

/**
 * Factory function to retrieve a PaymentProvider instance by name.
 * Falls back to MockProvider if the specified provider is unknown.
 *
 * @param {string} [providerName] - Name of the provider ('stripe', 'mock', etc.)
 * @returns {import('./paymentService.js').PaymentProvider} An instantiated PaymentProvider
 */
export const getPaymentProvider = (providerName) => {
  if (!providerName || typeof providerName !== 'string') {
    return new MockProvider();
  }

  const normalized = providerName.trim().toLowerCase();
  const ProviderClass = providerRegistry[normalized];

  if (!ProviderClass) {
    console.warn(
      `[PaymentGateway] Provider '${providerName}' not recognized. Falling back to MockProvider.`
    );
    return new MockProvider();
  }

  return new ProviderClass();
};

/**
 * Resolve the currently active PaymentProvider configured in the environment.
 * Reads PAYMENT_PROVIDER from process.env (defaults to 'mock').
 *
 * @returns {import('./paymentService.js').PaymentProvider} Active PaymentProvider instance
 */
export const getActiveProvider = () => {
  const configuredProvider = process.env.PAYMENT_PROVIDER || 'mock';
  return getPaymentProvider(configuredProvider);
};

/**
 * Register a new payment provider strategy dynamically without modifying existing logic.
 *
 * @param {string} name - Unique identifier for the provider (e.g. 'paypal')
 * @param {Function} providerClass - Class constructor extending PaymentProvider
 */
export const registerProvider = (name, providerClass) => {
  if (!name || typeof name !== 'string') {
    throw new Error('Provider name must be a non-empty string');
  }
  if (!providerClass) {
    throw new Error('Provider class constructor must be provided');
  }
  providerRegistry[name.trim().toLowerCase()] = providerClass;
};

/**
 * Get list of all currently supported provider keys.
 *
 * @returns {string[]} Array of provider identifiers
 */
export const getSupportedProviders = () => {
  return Object.keys(providerRegistry);
};

export default {
  getPaymentProvider,
  getActiveProvider,
  registerProvider,
  getSupportedProviders,
};
