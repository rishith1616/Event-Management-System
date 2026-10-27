/**
 * services/paymentService.js — Payment Provider Strategy Interface
 *
 * Implements the Strategy Pattern for payment processing.
 * This abstract base class defines the contract that all concrete payment providers
 * (e.g. Stripe, MockProvider, PayPal) must adhere to. By decoupling the checkout
 * and ticketing inventory logic from specific third-party payment APIs, providers
 * can be swapped seamlessly via configuration without altering core business rules.
 */

export class PaymentProvider {
  /**
   * Process a payment charge through the provider.
   *
   * @param {number} amount - The transaction amount (e.g. 99.99).
   * @param {string} currency - The ISO currency code (e.g. 'USD', 'EUR').
   * @param {string} token - The payment method token or nonce from the client.
   * @returns {Promise<{ success: boolean, transactionId: string|null, error: string|null }>}
   * @throws {Error} If not implemented by concrete subclass.
   */
  async charge(amount, currency, token) {
    throw new Error(`Method 'charge()' must be implemented by concrete subclass of PaymentProvider`);
  }

  /**
   * Process a refund for a previously captured transaction.
   *
   * @param {string} transactionId - The original provider transaction ID.
   * @param {number} amount - The amount to refund.
   * @returns {Promise<{ success: boolean, refundId: string|null, error: string|null }>}
   * @throws {Error} If not implemented by concrete subclass.
   */
  async refund(transactionId, amount) {
    throw new Error(`Method 'refund()' must be implemented by concrete subclass of PaymentProvider`);
  }

  /**
   * Retrieve the human-readable identifier of the payment provider.
   *
   * @returns {string} The provider name.
   * @throws {Error} If not implemented by concrete subclass.
   */
  getName() {
    throw new Error(`Method 'getName()' must be implemented by concrete subclass of PaymentProvider`);
  }
}

export default PaymentProvider;
