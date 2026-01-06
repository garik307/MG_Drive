const Queue = require('bull');
const Email = require('../utils/Email');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const jobQueue = new Queue('background-jobs', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

jobQueue.process(5, async (job) => {
  console.log(`[Job] Processing ${job.name || 'default'} (ID: ${job.id})`);

  try {
    // In Bull, job.name is only available if added as queue.add('name', data)
    // If added as queue.add(data), job.name is '__default__'
    
    // We expect named jobs 'sendEmail'
    if (job.name === 'sendEmail' || job.data.type === 'sendEmail') {
      const { user, url, data, template, subject } = job.data;
      
      // Reconstruct Email instance
      const emailService = new Email(user, url, data);
      
      await emailService.send(template, subject);
      console.log(`[Job] Email sent to ${user.email} (Template: ${template})`);
    }
    
    // Add other job types here
    
  } catch (err) {
    console.error(`[Job] Failed ${job.id}: ${err.message}`);
    throw err; // Trigger retry
  }
});

jobQueue.on('completed', (job) => {
  console.log(`[Job] Completed ${job.id}`);
});

jobQueue.on('failed', (job, err) => {
  console.error(`[Job] Failed ${job.id} has failed with ${err.message}`);
});

console.log('Worker started...');
