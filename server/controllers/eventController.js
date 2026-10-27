/**
 * controllers/eventController.js — Event controller for public browsing and filtering
 * Handles querying active published events with search, category/date filters,
 * pagination, and retrieving individual event details.
 */
import mongoose from 'mongoose';
import Event from '../models/Event.js';

// Helper to escape regex special characters
const escapeRegex = (string) => string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

/**
 * @desc    Get published, active events with filtering, search, sorting, and pagination
 * @route   GET /api/events
 * @access  Public
 */
export const getEvents = async (req, res, next) => {
  try {
    const {
      category,
      startDate,
      endDate,
      search,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    // Base filter: Only published events occurring today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = {
      status: 'published',
      date: { $gte: today },
    };

    // Category filter
    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      query.category = new RegExp(`^${escapeRegex(category.trim())}$`, 'i');
    }

    // Date range filter
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) {
        // Ensure date does not bypass the active/future constraint
        const effectiveStart = parsedStart > today ? parsedStart : today;
        query.date.$gte = effectiveStart;
      }
    }

    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        parsedEnd.setHours(23, 59, 59, 999);
        query.date.$lte = parsedEnd;
      }
    }

    // Text search on title and description (case-insensitive regex)
    if (search && search.trim() !== '') {
      const sanitizedSearch = escapeRegex(search.trim());
      const searchRegex = new RegExp(sanitizedSearch, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
      ];
    }

    // Sorting
    let sortOption = { date: 1, time: 1 };
    if (sort === 'price') {
      sortOption = { price: 1, date: 1 };
    } else if (sort === 'price-desc') {
      sortOption = { price: -1, date: 1 };
    } else if (sort === 'title') {
      sortOption = { title: 1 };
    } else if (sort === 'title-desc') {
      sortOption = { title: -1 };
    } else if (sort === 'date-desc') {
      sortOption = { date: -1, time: -1 };
    } else {
      // Default: sort by date ascending (soonest event first)
      sortOption = { date: 1, time: 1 };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [total, events] = await Promise.all([
      Event.countDocuments(query),
      Event.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .populate('organizer', 'name email')
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      limit: limitNum,
      events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single event by ID (only if published and active)
 * @route   GET /api/events/:id
 * @access  Public
 */
export const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const event = await Event.findById(id)
      .populate('organizer', 'name email')
      .lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Exclude unpublished, canceled, or suspended events
    if (event.status !== 'published') {
      return res.status(404).json({
        success: false,
        message: 'This event is currently unavailable or has been canceled',
      });
    }

    // Exclude past events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(event.date) < today) {
      return res.status(404).json({
        success: false,
        message: 'This event has already passed',
      });
    }

    res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    next(error);
  }
};
