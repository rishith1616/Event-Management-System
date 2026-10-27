/**
 * controllers/eventController.js — Event controller functions
 * Handles event creation, draft updates, publishing, and organizer listings.
 */
import Event from '../models/Event.js';

/**
 * @desc    Create a new event (draft)
 * @route   POST /api/events
 * @access  Private (Organizer)
 */
export const createEvent = async (req, res, next) => {
  try {
    const { title, description, date, time, venue, capacity, price, category } = req.body;

    // Validate required title
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Event title is required',
      });
    }

    // Validate date (must be provided and strictly in the future)
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Event date is required',
      });
    }
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime()) || eventDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Event date must be in the future',
      });
    }

    // Validate time
    if (!time || !time.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Event time is required',
      });
    }

    // Validate venue
    if (!venue || !venue.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Venue is required',
      });
    }

    // Validate capacity (explicit requirement: cannot create/publish without capacity)
    if (capacity === undefined || capacity === null || capacity === '') {
      return res.status(400).json({
        success: false,
        message: 'Capacity limit is required',
      });
    }
    const parsedCapacity = Number(capacity);
    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Capacity limit is required and must be greater than 0',
      });
    }

    // Validate price
    if (price === undefined || price === null || price === '') {
      return res.status(400).json({
        success: false,
        message: 'Price is required',
      });
    }
    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a non-negative number',
      });
    }

    // Create event with status 'draft' and current organizer
    const event = new Event({
      title: title.trim(),
      description: description ? description.trim() : '',
      date: eventDate,
      time: time.trim(),
      venue: venue.trim(),
      capacity: parsedCapacity,
      availableTickets: parsedCapacity,
      price: parsedPrice,
      category: category || 'other',
      status: 'draft',
      organizer: req.user.id,
    });

    await event.save();

    return res.status(201).json({
      success: true,
      message: 'Event created successfully as draft',
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update existing event (must be owner)
 * @route   PUT /api/events/:id
 * @access  Private (Organizer)
 */
export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check ownership
    if (event.organizer.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event',
      });
    }

    const { title, description, date, time, venue, capacity, price, category } = req.body;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: 'Event title cannot be empty' });
      }
      event.title = title.trim();
    }

    if (description !== undefined) {
      event.description = description.trim();
    }

    if (date !== undefined) {
      const eventDate = new Date(date);
      if (isNaN(eventDate.getTime()) || eventDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Event date must be in the future',
        });
      }
      event.date = eventDate;
    }

    if (time !== undefined) {
      if (!time.trim()) {
        return res.status(400).json({ success: false, message: 'Event time cannot be empty' });
      }
      event.time = time.trim();
    }

    if (venue !== undefined) {
      if (!venue.trim()) {
        return res.status(400).json({ success: false, message: 'Venue cannot be empty' });
      }
      event.venue = venue.trim();
    }

    if (capacity !== undefined) {
      const parsedCapacity = Number(capacity);
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Capacity limit is required and must be greater than 0',
        });
      }
      const ticketsSold = event.capacity - (event.availableTickets ?? event.capacity);
      if (parsedCapacity < ticketsSold) {
        return res.status(400).json({
          success: false,
          message: `Capacity cannot be lower than tickets already sold (${ticketsSold})`,
        });
      }
      event.availableTickets = parsedCapacity - ticketsSold;
      event.capacity = parsedCapacity;
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a non-negative number',
        });
      }
      event.price = parsedPrice;
    }

    if (category !== undefined) {
      event.category = category;
    }

    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Publish an event (validate future date and capacity > 0)
 * @route   PATCH /api/events/:id/publish
 * @access  Private (Organizer)
 */
export const publishEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check ownership
    if (event.organizer.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this event',
      });
    }

    // Validate capacity
    if (!event.capacity || event.capacity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Capacity limit is required and must be greater than 0',
      });
    }

    // Validate future date
    if (!event.date || new Date(event.date) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish event with a past date. Event date must be in the future',
      });
    }

    // Validate essential required details
    if (!event.title || !event.venue || !event.time) {
      return res.status(400).json({
        success: false,
        message: 'Title, venue, and time are required before publishing',
      });
    }

    // Set published status and set availableTickets to capacity
    event.status = 'published';
    event.availableTickets = event.capacity;

    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Event published successfully',
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all events created by logged-in organizer
 * @route   GET /api/events/my-events
 * @access  Private (Organizer)
 */
export const getMyEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user.id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all published events for public listing
 * @route   GET /api/events
 * @access  Public
 */
export const getEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ status: 'published' })
      .populate('organizer', 'name email')
      .sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get event by ID
 * @route   GET /api/events/:id
 * @access  Public
 */
export const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    return res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    next(error);
  }
};
