/**
 * middleware/roleCheck.js — Role authorization middleware
 * Factory middleware to restrict access to specific user roles (e.g. organizer, admin, attendee).
 */
import { authorize } from './auth.js';

export { authorize };
export default authorize;
