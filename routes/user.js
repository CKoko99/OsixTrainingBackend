import { Router } from "express";
import { dbAdmin as db, authAdmin } from "../firebaseAdmin.js";
import { FieldValue } from 'firebase-admin/firestore'

const router = Router(); // Create an instance of the Router

router.get("/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) {
            console.log("No user ID provided");
            res.status(400).json({ error: "No user ID provided" });
            return;
        }
        let userRef = db.collection("Users").doc(userId); // Reference the 'Users' collection using db

        // Now you can fetch the data for the specific user document
        const docSnapshot = await userRef.get();

        if (docSnapshot.exists) {
            const userData = docSnapshot.data();

            //if there is no display name, get it from google auth
            if (!userData.displayName) {
                await authAdmin.getUser(userId).then(async (userRecord) => {
                    userData.displayName = userRecord.displayName;
                    await userRef.set(userData, { merge: true });
                }).catch((error) => {
                    console.log("Error Setting user display name in firestore", error);
                });
            }

            res.json({ ...userData });
        } else {
            // User document doesn't exist in Firestore, create a new one\
            //get the google auth display name
            let userData = {};
            userData.userId = userId;
            await authAdmin.getUser(userId).then(async (userRecord) => {
                userData.displayName = userRecord.displayName;
                await userRef.set(userData, { merge: true });
            }).catch((error) => {
                console.log("Error Creating user in firestore", error);
            });

            res.json({ ...userData });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

router.post("/form", async (req, res) => {
    try {
        const userId = req.body.userId;
        const formId = req.body.formId;
        const userRef = db.collection("Users").doc(userId); // Reference the 'Users' collection using db
        //console.log(db)
        // Update the 'completedForms' field using arrayUnion
        await userRef.set(
            {
                completedForms: FieldValue.arrayUnion(formId),
            },
            { merge: true }
        );
        console.log(`${formId} added to ${userId} completedForms array`);
        res.json({ message: `${formId} added to ${userId} completedForms array"` });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/:userId/results', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { quizTitle, score, timeSpent } = req.body;
        const userRef = db.collection("Users").doc(userId); // Reference the 'Users' collection using db

        // Update the 'results' field using arrayUnion
        await userRef.set(
            {
                results: FieldValue.arrayUnion({
                    quizTitle,
                    score,
                    timeSpent,
                }),
            },
            { merge: true }
        );

        console.log(`${quizTitle} added to ${userId} results array`);
        res.json({ message: `${quizTitle} added to ${userId} results array` });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});


router.post('/:userId/store/', async (req, res) => {
    try {
        const userId = req.params.userId;
        const storeId = req.body.storeId;
        const userRef = db.collection('Users').doc(userId); // Reference the 'Users' collection

        // Use .set() to update the document with merge: true to only update specific fields
        await userRef.set({ store: storeId }, { merge: true });

        console.log(`${storeId} added to ${userId} store`);
        res.json({ message: `${storeId} added to ${userId} store` });
    } catch (error) {
        console.log("Error adding store to user");
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/:userId/legacy', async (req, res) => {
    try {
        const userId = req.params.userId;
        const userRef = db.collection('Users').doc(userId); // Reference the 'Users' collection
        //get value from body
        const legacy = req.body.value;
        // Use .set() to update the document with merge: true to only update specific fields
        await userRef.set({ legacy }, { merge: true });

        console.log(`legacy status updated for ${userId}`);
        res.json({ message: `legacy status updated for ${userId}` });
    } catch (error) {
        console.log("Error updating legacy status for user");
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/:userId/log', async (req, res) => {
    try {
        const userId = req.params.userId;
        const userRef = db.collection('Users').doc(userId); // Reference the 'Users' collection using dbAdmin

        // Use dbAdmin.firestore.FieldValue.increment(1) to increment the 'minutesLoggedIn' field
        await userRef.update({
            minutesLoggedIn: FieldValue.increment(1),
        }).then(() => {
            res.json({ message: `Successfully logged ${userId} in for 1 minute.` });
        }).catch((error) => {
            console.error("Error logging user in: ", error);
            res.status(500).json({ error: error.message });
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});


export default router;