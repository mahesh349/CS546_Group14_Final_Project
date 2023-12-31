import { Router } from "express";
const router = Router();
import {
  fetchBookindData,
  cardPaymnetOnSuccess,
  CreateBooking,
  GetBooking,
  DeleteBooking,
  UpdateBooking,
} from "../../data/booking.js";
import { getRoomByNumber } from "../../data/room.js";
import xss from "xss";
import * as helpers from "../../helpers.js";
import fs from "fs";
import { createReceiptPDF } from "../../utils/createPdf.js";

router.route("/").get(async (req, res) => {
  try {
    res.render("./guest/guestBooking/book", {
      title: "guest booking page",
    });
  } catch (e) {
    return res.status(500).render("error", { title: "Error Page", error: e });
  }
});

router.route("/book/:roomNumber").post(async (req, res) => {
  try {
    const AddBookingData = req.body;
    //get roomdetails pass it here
    // let roomNumber = req.params
    const firstName = AddBookingData.FirstNameInput;
    const lastName =  AddBookingData.LastNameInput;
    const emailInput = AddBookingData.EmailIdInput;
    const phoneNum = AddBookingData.phone;
    const checkInDate = AddBookingData.CheckinDateInput;
    const checkOutDate = AddBookingData.CheckoutDateInput;
    const firstNameErr = {empty:'First Name cannot be Empty', invalid:'First Name is invalid and cannot be less than 2 letters'};
    const lastNameErr = {empty:'Last Name cannot be Empty', invalid:'Last Name is invalid and cannot be less than 2 letters'};
    const firstAcctName = await helpers.validateString(firstName,2,25,firstNameErr);
    const validateFName = xss(firstAcctName);
    const lastAcctName = await helpers.validateString(lastName,2,25,lastNameErr);
    const validateLName = xss(lastAcctName);
    const emailInputValidate = await helpers.validateEmail(emailInput);
    const  validateXSSEmail= xss(emailInputValidate);
    const validatePhoneNumber = await helpers.validatePhoneNumber(phoneNum);
    const  validateDPhone= xss(validatePhoneNumber);
    const validateCheckInDate = await helpers.validateDates(checkInDate);
    const validateCheckOutDate = await helpers.validateDates(checkOutDate);
    await helpers.checkCheckInAndOutDate(checkInDate,checkOutDate);
    //const checkInDate = await helpers.
    let roomNumber = parseInt(req.params.roomNumber, 10);
    let bookedRoom = await getRoomByNumber(roomNumber);


    const newBooking = await CreateBooking(
      validateFName,
      validateLName,
      validateXSSEmail,
      validateDPhone,
      validateCheckInDate,
      validateCheckOutDate,
      bookedRoom.roomNumber,
      bookedRoom.roomPrice,
      bookedRoom.roomType
    );

    req.session.insertBookingId = newBooking.insertedId;

    //get booking frm id
    let bookingIdcheck = req.session.insertBookingId;
    bookingIdcheck = String(bookingIdcheck);

    let bookingDetails = await fetchBookindData(bookingIdcheck);
    res.render("./guest/guestPayment/payment", {
      title: "Payment Page",
      bookingDetails: bookingDetails,
    });
  } catch (e) {
    console.log(e);
    const roomNumberVal = parseInt(req.params.roomNumber, 10);
    const roomId = await roomNumberToId(roomNumberVal);
    res.render('./guest/guestBooking/booking', { error:e.error,room: roomId, roomNumber: req.body.roomNumber, roomType: req.body.roomType, roomPrice: req.body.roomPrice});
  }
});

router.route("/payment").post(async (req, res) => {
  try {
    const bookingId = req.session.insertBookingId;
    const validateBookingId = await helpers.checkId(bookingId, "booking id");
    const { cardNumber, cardName, expiryMonth, expiryYear, cvv } = req.body;
    const validatedCardNumber = await helpers.validateCardNumber(cardNumber);
    const sanitizeCard = xss(validatedCardNumber);
    const validteExpiryMonth = await helpers.validateExpiryMonth(expiryMonth);
    const sanitizeExpiryMonth = xss(validteExpiryMonth);
    const name = await helpers.validateCardName(cardName);
    const sanitizeName = xss(name);
    const validteCardName = await helpers.validateExpiryYear(expiryYear);
    const sanitizeCardName = xss(validteCardName);
    const validateCVV = await helpers.validateCVV(cvv);
    const sanitizevalidateCVV = xss(validateCVV);
    const payment = await cardPaymnetOnSuccess(validateBookingId, sanitizeName);
    if (payment.acknowledged === true) {
      res.render("./guest/guestPayment/payment", {
        title: "Payment Page",
        paymentSuccess: true,
      });
    }
  } catch (e) {
    //return res.status(500).render("error", { title: "Error Page", error: e });
    es.render('./guest/guestPayment/payment', { error:e.error,title: "Payment Page",paymentSuccess: false});
  }
});

router.route("/report").get(async (req, res) => {
  try {
    const bookingId = req.session.insertBookingId;
    const validatedBookingID = await helpers.checkId(bookingId, "booking id");
    const firstNameInput = req.session.user.firstName;
    const lastNameInput = req.session.user.lastName;
    const firstNameErr = {
      empty: "First name  cannot be Empty",
      invalid: "First name is invalid",
    };
    const lastNameErr = {
      empty: "Last name cannot be Empty",
      invalid: "Last name is invalid",
    };
    const firstName = await helpers.validateString(
      firstNameInput,
      2,
      25,
      firstNameErr
    );
    const lastName = await helpers.validateString(
      lastNameInput,
      2,
      25,
      lastNameErr
    );
    const fetchBookingDataDetails = await fetchBookindData(validatedBookingID);
    //code for pdf generation
    const pdfPath = `./pdfs/account-details-${validatedBookingID}.pdf`;
    if (!fs.existsSync("./pdfs")) {
      fs.mkdirSync("./pdfs");
    }

    await createReceiptPDF(
      {
        "First Name": fetchBookingDataDetails.firstName,
        "Last Name": fetchBookingDataDetails.lastName,
        "Email": fetchBookingDataDetails.emailId,
        "Phone Number": fetchBookingDataDetails.contactNumber,
        "Room Price": "$" + fetchBookingDataDetails.roomPrice + "/day",
        "Number of Days": fetchBookingDataDetails.numberOfDays,
        "Tax": "$" + fetchBookingDataDetails.taxPrice,
        "Service Fee":"$" +  fetchBookingDataDetails.serviceFee,
        "Final Price":"$" +  fetchBookingDataDetails.finalPrice,
        "Booking Date": fetchBookingDataDetails.BookingDate,
        "Check In-Date": fetchBookingDataDetails.CheckinDate,
        "Check Out-Date": fetchBookingDataDetails.CheckOutDate,
        //'Phone':`${phonePrefixVal} ${phoneNumber}`
      },
      pdfPath
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=account-details-${validatedBookingID}.pdf`
    );
    const readStream = fs.createReadStream(pdfPath);
    readStream.pipe(res);
    readStream.on("end", () => {
      fs.unlinkSync(pdfPath);
    });
  } catch (e) {
    return res.status(500).render("error", { title: "Error Page", error: e });
  }
  //
});

export default router;
