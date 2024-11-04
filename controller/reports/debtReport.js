const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Controller function to get active customers with outstanding debt more than twice their monthly charge, grouped by collection day with count
async function getCustomersWithDebtReport(req, res) {
  try {
    // Fetch active customers with unpaid invoices
    const customers = await prisma.customer.findMany({
      where: {
        status: 'ACTIVE', // Only active customers
        invoices: {
          some: { status: 'UNPAID' }
        }
      },
      select: {
        firstName: true,
        lastName: true,
        phoneNumber: true,
        email: true,
        monthlyCharge: true,
        closingBalance: true, // Include closing balance for total debt
        garbageCollectionDay: true // Include collection day for grouping
      }
    });

    // Filter active customers whose closing balance (total debt) is more than twice their monthly charge
    const customersWithHighDebt = customers.filter(customer => {
      return customer.closingBalance > 2 * customer.monthlyCharge;
    });

    if (!customersWithHighDebt.length) {
      return res.status(404).json({ message: "No active customers with debt exceeding twice the monthly charge found." });
    }

    // Group customers by garbage collection day and include a count of customers per day
    const groupedByCollectionDay = customersWithHighDebt.reduce((acc, customer) => {
      const day = customer.garbageCollectionDay;
      if (!acc[day]) {
        acc[day] = { count: 0, customers: [] };
      }
      acc[day].count += 1;
      acc[day].customers.push(customer);
      return acc;
    }, {});

    // Generate the PDF report
    const filePath = path.join(__dirname, '..', 'reports', 'active-customers-high-debt-by-collection-day-report.pdf');
    await generatePDF(groupedByCollectionDay, filePath);

    // Send the file as a downloadable response
    res.download(filePath, 'active-customers-high-debt-by-collection-day-report.pdf', (err) => {
      if (err) {
        console.error('File download error:', err);
        res.status(500).send('Error generating report');
      }
      // Optionally delete the file after sending
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('Error fetching active customer debt report:', error);
    res.status(500).send('Error generating report');
  }
}

// Helper function to generate the PDF report
function generatePDF(groupedByCollectionDay, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Load the company logo
    const logoPath = path.join(__dirname, '..', 'assets', 'icon.png');

    // Add the Company Logo and Name at the top
    doc.image(logoPath, 50, 45, { width: 100 }) // Adjust position and size as needed
      .fontSize(20)
      .text('TAQa MALI ', 160, 50) // Position name next to logo
      .fontSize(10)
      .text('TAQA MALI,KISERIAN,NGONG,RONGAI,MATASIA,', 160, 80)
    
      .fontSize(10)
      .text('For all the inqueries, Call  0726594923 , We help you Conserve and Protect the environment', 160, 110)
      .moveDown(); 
    // Add a divider line after the header
    doc.moveTo(50, 120).lineTo(550, 150).stroke();

    // Title for the report
    doc.fontSize(18).text('Customers with Outstanding Debt Report', { align: 'center' });
    doc.moveDown();

    // Loop through each collection day group
    for (const [day, { count, customers }] of Object.entries(groupedByCollectionDay)) {
      doc.fontSize(16).text(`Collection Day: ${day} (Total Customers: ${count})`, { underline: true });
      doc.moveDown();

      // Loop over customers in this collection day group
      customers.forEach((customer) => {
        doc.fontSize(14).fillColor('#333').text(`Customer: ${customer.firstName} ${customer.lastName}, Phone: ${customer.phoneNumber}, Monthly Charge: ${customer.monthlyCharge.toFixed(2)}, Closing Balance: ${customer.closingBalance.toFixed(2)}`);
        doc.moveDown(); // Add some spacing between customers
      });

      // Add a space between collection days
      doc.moveDown();
    }

    doc.end();

    // Resolve or reject the promise based on stream events
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

module.exports = {
  getCustomersWithDebtReport,
};