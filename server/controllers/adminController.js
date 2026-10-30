/**
 * controllers/adminController.js — Platform Admin moderation and suspension controller
 * Implements FR-09: Platform Admin Suspensions for events and organizer accounts.
 */
import Event from '../models/Event.js';
import User from '../models/User.js';

/**
 * @desc    Get system overview for admin dashboard
 * @route   GET /api/admin/overview
 * @access  Private (Admin)
 */
export const getAdminOverview = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrganizers = await User.countDocuments({ role: 'organizer' });
    const suspendedUsersCount = await User.countDocuments({ isSuspended: true });

    const totalEvents = await Event.countDocuments();
    const publishedEventsCount = await Event.countDocuments({ status: 'published', isSuspended: false });
    const suspendedEventsCount = await Event.countDocuments({
      $or: [{ status: 'suspended' }, { isSuspended: true }],
    });

    const events = await Event.find()
      .populate('organizer', 'name email role isSuspended')
      .sort({ createdAt: -1 });

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      metrics: {
        totalUsers,
        totalOrganizers,
        suspendedUsersCount,
        totalEvents,
        publishedEventsCount,
        suspendedEventsCount,
      },
      events,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Suspend an event for terms of service violations (FR-09)
 * @route   PATCH /api/admin/events/:id/suspend
 * @access  Private (Admin)
 */
export const suspendEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Terms of service violation' } = req.body || {};

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    event.status = 'suspended';
    event.isSuspended = true;
    event.suspendedAt = new Date();
    event.suspensionReason = reason;
    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Event has been suspended. Public listings and ticket sales are blocked.',
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unsuspend / reinstate an event
 * @route   PATCH /api/admin/events/:id/unsuspend
 * @access  Private (Admin)
 */
export const unsuspendEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    event.status = 'published';
    event.isSuspended = false;
    event.suspendedAt = null;
    event.suspensionReason = '';
    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Event has been reinstated and published.',
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Suspend a user or organizer account (FR-09)
 * @route   PATCH /api/admin/users/:id/suspend
 * @access  Private (Admin)
 */
export const suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Account suspended for policy violations' } = req.body || {};

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Platform administrator accounts cannot be suspended',
      });
    }

    user.isSuspended = true;
    user.suspendedAt = new Date();
    user.suspensionReason = reason;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.email} (${user.role}) has been suspended. Associated event sales are blocked.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSuspended: user.isSuspended,
        suspendedAt: user.suspendedAt,
        suspensionReason: user.suspensionReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unsuspend / reactivate a user account
 * @route   PATCH /api/admin/users/:id/unsuspend
 * @access  Private (Admin)
 */
export const unsuspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isSuspended = false;
    user.suspendedAt = null;
    user.suspensionReason = '';
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.email} has been reactivated.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSuspended: user.isSuspended,
      },
    });
  } catch (error) {
    next(error);
  }
};
