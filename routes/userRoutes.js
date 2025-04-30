const express = require('express');
const userController = require('../controllers/userController');
const advidController = require('../controllers/advidController');

const mmptrackerController = require('../controllers/mmptrackerController');
const reviewController = require('../controllers/reviewController');
const paybleeventController = require('../controllers/paybleeventController');

const pidController = require('../controllers/pidController');

const publdController = require('../controllers/publdController');

const advdataController = require('../controllers/advdataController');
const pubdataController = require('../controllers/pubdataController');



const authMiddleware = require('../middlewares/authMiddleware');
// const { updateUserImage, upload } = require("../controllers/imgController");

const verifyToken = require('../middlewares/verifyToken'); // Middleware path


const router = express.Router();

// admin login, create, combin data 
router.post('/create-subadmin', userController.createSubAdmin);
router.post('/login-subadmin', userController.loginSubAdmin);
router.get('/combin-data/:pid', userController.getCombinedData);
router.get('/user-data/:userId', userController.getUserData);
router.get('/get-subadmin', userController.getSubAdmins);
router.post('/update-reviews/:id', userController.updateReview);
router.post('/change-pass/:userId', userController.changePassword);
router.put('/update-sub-admin', userController.updateSubAdmin);
router.delete('/delete-sub-admin', userController.deleteSubAdmin);




//for mmp tracker
router.get('/get-mmptracker', mmptrackerController.getMMPTrackerByUserId);
router.post('/add-mmptracker', mmptrackerController.createMMPTracker);
router.post("/update-mmptracker/:id", mmptrackerController.editMMPTracker);


//for pide
router.get('/get-pid', pidController.getPids);
router.post('/add-pid', pidController.createPid);
router.post("/update-pid/:id", pidController.editPid);
router.get('/get-allpub', pidController.getAllPublishers);
router.get('/get-Namepub', pidController.getNamePublishers);

router.get('/get-NameAdv', advidController.getAllAdvertisers
);



//for reviews
router.get('/get-reviews', reviewController.getReviewforall);
router.post('/add-reviews', reviewController.createReviews);
router.post("/update-reviews/:id", reviewController.editReviews);

//for payble
router.get('/get-paybleevernt', paybleeventController.getPaybleevent);
router.post('/add-paybleevernt', paybleeventController.createPayble);
router.post("/update-event/:id", paybleeventController.editPayble);



//for adv ids
router.post('/create-advid', advidController.createAdvertisement);
 router.get("/advid-data/:user_id", advidController.getAdvertisementsByUserId);
 router.put('/update-advid', advidController.updateAdvertisement);
 router.post('/advid-pause', advidController.updateAdvPause);

 
 

 //for publ ids
 router.post('/create-pubid', publdController.createPublisher);
 router.get("/pubid-data/:user_id", publdController.getPublisherByUserId);
 router.put('/update-pubid', publdController.updatePublisher);
 router.post('/publisher-pause', publdController.updatePublisherPause);

 

 

 //for adv data
 router.post('/add-advdata', advdataController.addAdvData);
 router.get("/get-advdata", advdataController.getAllAdvData); 
 router.get("/advdata-byuser/:id", advdataController.getAdvDataById);
 router.post("/advdata-update/:id", advdataController.updateAdvData);
 router.post("/advdata-delete-data/:id", advdataController.deleteAdvData);

 
//for publ data
 router.post('/add-pubdata', pubdataController.addPubData);
 router.get("/all-pubdata", pubdataController.getAllPubData); 
 router.get("/pubdata-byuser/:id", pubdataController.getPubDataByUserId);
 router.post("/pubdata-update/:id", pubdataController.updatePubData);
 router.post("/pubdata-delete-data/:id", pubdataController.deletePubData);
 router.post("/send-pub-message/", pubdataController.sendPubMessage);

 

//  router.post("/addrequest", pubdataController.addPubRequest);
//  router.put("/updaterequest", pubdataController.updateAdvRes);
//  router.get("/get-allrequests", pubdataController.getAllPubRequests); 

 
 
//  router.post('/send-message', pubdataController.sendPubMessage);

 


module.exports = router;
