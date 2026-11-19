import mongoose from 'mongoose';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/event-management');
  const users = await mongoose.connection.collection('users').find({}).toArray();
  console.log('ALL USERS:');
  users.filter(u => u.role !== 'attendee').forEach(u => console.log(' - ID:', u._id.toString(), 'Email:', u.email, 'Name:', u.name, 'Role:', u.role));
  
  const flashEvent = await mongoose.connection.collection('events').findOne({ title: /Flash Sale/i });
  console.log('\nFLASH EVENT:');
  console.log(' - ID:', flashEvent?._id?.toString());
  console.log(' - Title:', flashEvent?.title);
  console.log(' - Organizer on Flash Event:', flashEvent?.organizer?.toString());

  await mongoose.disconnect();
}
check();
