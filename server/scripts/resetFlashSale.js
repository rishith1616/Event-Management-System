import mongoose from 'mongoose';

async function resetFlashSale() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/event-management';
  await mongoose.connect(MONGO_URI);

  console.log('\n======================================================');
  console.log('  PES EVENTFLOW — RESETTING FLASH SALE FOR DEMO');
  console.log('======================================================');

  const eventsCol = mongoose.connection.collection('events');
  const ticketsCol = mongoose.connection.collection('tickets');
  const paymentsCol = mongoose.connection.collection('payments');
  const usersCol = mongoose.connection.collection('users');

  const flashEvent = await eventsCol.findOne({ title: /Flash Sale/i });

  if (flashEvent) {
    // 1. Delete all flash sale tickets
    const delTickets = await ticketsCol.deleteMany({
      $or: [
        { event: flashEvent._id },
        { eventId: flashEvent._id },
        { tierName: 'Flash Sale Fast Pass' },
        { contactEmail: /pes_flash_/i }
      ]
    });
    console.log(`  ✓ Cleared ${delTickets.deletedCount} flash sale tickets from 'tickets' collection`);

    // 2. Delete all flash sale payments
    const delPayments = await paymentsCol.deleteMany({
      $or: [
        { event: flashEvent._id },
        { eventId: flashEvent._id },
        { transactionId: /PAY-FLASH-/i }
      ]
    });
    console.log(`  ✓ Cleared ${delPayments.deletedCount} flash sale payments from 'payments' collection`);

    // 3. Delete temporary buyer test user accounts
    const delUsers = await usersCol.deleteMany({ email: /pes_flash_|buyer_.*_flash/i });
    console.log(`  ✓ Cleared ${delUsers.deletedCount} test buyer accounts from 'users' collection`);

    // 4. Reset ticket inventory back to 50
    const tiers = flashEvent.ticketTiers || [];
    if (tiers.length > 0) {
      tiers[0].available = 50;
      tiers[0].capacity = 50;
    }

    await eventsCol.updateOne(
      { _id: flashEvent._id },
      {
        $set: {
          availableTickets: 50,
          capacity: 50,
          ticketTiers: tiers,
          status: 'published'
        }
      }
    );
    console.log(`  ✓ Reset event capacity to 50/50 available seats`);
    console.log(`  ✓ Preserved Event ID: ${flashEvent._id} (Dashboard buttons stay synced)`);
  } else {
    console.log('  Notice: No flash sale event found to reset.');
  }

  // Verification
  const remainingTickets = await ticketsCol.countDocuments({ tierName: 'Flash Sale Fast Pass' });
  const remainingPayments = await paymentsCol.countDocuments({ transactionId: /PAY-FLASH-/i });
  const updatedEvent = await eventsCol.findOne({ title: /Flash Sale/i });

  console.log('\n📊 POST-RESET STATE FOR LIVE PRESENTATION:');
  console.log(`  • Event Title:       "${updatedEvent?.title}"`);
  console.log(`  • Available Seats:   ${updatedEvent?.availableTickets} / ${updatedEvent?.capacity}`);
  console.log(`  • Active Tickets:    ${remainingTickets} (Ready to receive 50 concurrent buyers)`);
  console.log(`  • Active Payments:   ${remainingPayments}`);
  console.log('======================================================');
  console.log('🎯 SYSTEM IS PRIMED FOR YOUR LIVE DEMONSTRATION!\n');

  await mongoose.disconnect();
}

resetFlashSale().catch(console.error);
