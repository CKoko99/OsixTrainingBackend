import { Router } from "express";
import { authAdmin } from "../firebaseAdmin.js";
import jwt from 'jsonwebtoken'

const router = Router(); // Create an instance of the Router


router.get("/signin", async (req, res) => {
    // User will send their userId in the header
    try {
        const userId = req.headers.userid;
        //console.log(req.headers)
        if (!userId) {
            return
        }
        // Search for the user in Firestore
        let userRecord
        try {
            userRecord = await authAdmin.getUser(userId);
        } catch (error) {
            console.log(error)
            res.status(401).json({ error: "User not found" })
            return
        }
        console.log(userRecord)
        //check if user email is from getaiu.com
        if (userRecord.email.split('@')[1] !== "getaiu.com") {
            res.status(401).json({ error: "You must use a getaiu.com email address to log in" })
        } else {
            //user is valid, create a new JWT token and send it back to the user
            const token = jwt.sign({ userId: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.status(200).json({ token: token });
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }

});
router.get("/verify", async (req, res) => {
    //verify the token
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: "No token provided" })
    }
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        res.status(200).json({ userId: decodedToken.userId })
    } catch (error) {
        res.status(401).json({ error: "Invalid token" })
    }
});

export default router;