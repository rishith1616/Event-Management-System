/**
 * services/transactionService.js — ACID Transaction Service Utility
 * 
 * Provides a robust wrapper around MongoDB / Mongoose multi-document transactions.
 * Guarantees ACID compliance (Atomicity, Consistency, Isolation, Durability) across
 * critical operations such as ticket reservations, inventory decrements, and payments.
 * 
 * Transaction Lifecycle:
 * 1. Starts a new Mongoose ClientSession
 * 2. Begins a multi-document transaction with specified read/write concern options
 * 3. Executes user-provided business logic callback passing the active session
 * 4. Commits the transaction if callback succeeds
 * 5. Aborts the transaction and rolls back partial database changes if any error occurs
 * 6. Always terminates and closes the session in the finally block to prevent resource leaks
 */
import mongoose from 'mongoose';

/**
 * Executes an operation within an ACID-compliant MongoDB transaction session.
 * 
 * @template T
 * @param {(session: import('mongoose').ClientSession) => Promise<T>} callback - Async logic to execute within the transaction
 * @param {import('mongodb').TransactionOptions} [options] - Optional transaction options (readConcern, writeConcern, etc.)
 * @returns {Promise<T>} Result of the executed callback
 * @throws {Error} Re-throws any encountered error after aborting the transaction
 */
export const withTransaction = async (callback, options = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction(options);

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    // If the transaction has not already been aborted or committed, abort now
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error during transaction abort:', abortError.message);
      }
    }
    // Re-throw the original error to allow upstream controllers / middleware to handle it
    throw error;
  } finally {
    // Ensure the session is always closed to free server resources
    await session.endSession();
  }
};

export default withTransaction;
