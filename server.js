const express = require('express');

const cors = require('cors');
const helmet = require('helmet'); // Import Helmet
require('dotenv').config();
const bodyParser = require('body-parser');
const customerRoutes = require('./routes/customer/customerRoutes.js');
const userRoutes = require('./routes/userRoute/userRoute.js');
const invoiceRoutes = require('./routes/invoices/invoiceRoute.js');
const mpesaRoute = require('./routes/mpesa/mpesaRoute.js');
const collectionRoute = require('./routes/collection/collectionRoute.js');
const sendtoGroup = require('./routes/sms/sendSms.js');
const receiptRoute = require('./routes/receipt/receiptingRoute.js');
const paymentRoute = require('./routes/payment/paymentRoutes.js');
const statsRoute = require('./routes/stats/statsRoute.js');
const statsms = require('./routes/sms/statsmsRoute.js');
const uploadcustomers = require('./routes/fileUpload/uploadRoute.js');
const customerdetailsRoute = require('./routes/customer/customerDetailsRoute.js')
const smsBalanceRoute = require('./routes/sms/balance.js')
const reportsReoute  = require('./routes/reportRoutes/reportRoute.js')
const userManagementRoute = require('./routes/rolesRoute/roles.js')
const cookieParser = require('cookie-parser');

const permissionsRoutes = require('./routes/permision/permissionRoute.js')
const createTask = require('./routes/task/taskRoute.js')

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cookieParser());
//app.use(verifyToken);
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.use(helmet());
app.use(cors({
    origin: '*', 
    credentials: true,
}));


// Use customer routes
app.use('/api', customerRoutes);
app.use('/api', userRoutes);
app.use('/api', sendtoGroup);
app.use('/api', invoiceRoutes);
app.use('/api', mpesaRoute);
app.use('/api', collectionRoute);
app.use('/api', receiptRoute);
app.use('/api', paymentRoute);
app.use('/api', statsRoute);
app.use('/api', statsms);
app.use('/api', uploadcustomers); // Adjust your API path as needed
app.use('/api', customerdetailsRoute); 
app.use('/api', smsBalanceRoute); 
app.use('/api', reportsReoute); 
app.use('/api', userManagementRoute); 
app.use('/api', permissionsRoutes);
app.use('/api', createTask);


// Start the HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on:${PORT}`);
});

// Set server timeout
const timeoutDuration = 80000; // Set timeout duration in milliseconds (e.g., 60000 ms = 60 seconds)
server.setTimeout(timeoutDuration, () => {
  console.log(`Server timed out after ${timeoutDuration / 1000} seconds.`);
});
