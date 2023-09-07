import { Router } from "express";
import { db } from "../firebase.js";
import { doc, setDoc, getDoc, arrayUnion, collection, query, where, getDocs, updateDoc, increment } from "firebase/firestore";
import { tokenValidator } from "../service/user.service.js";

const router = Router(); // Create an instance of the Router

router.get("/signin", async (req, res) => {
    //user will send their userId in the header
    const userId = req.headers.userid;
    //Search for the user in firestore
    const userRef = doc(db, "Users", userId);
    const docSnapshot = await getDoc(userRef);
    if (docSnapshot.exists()) {
        //if they exist, create a new JWT token and send it back to the user
    } else {
        //if they don't exist, check google auth to see if they are a valid user

        //if they are, create a new user in firestore and send a new JWT token back to the user
        //if they aren't, send an error message back to the user
    }

})
router.get("/:userId", async (req, res) => {
    const userId = req.params.userId;
    //console.log(userId)
    try {
        const userRef = doc(db, "Users", userId);
        // Now you can fetch the data for the specific user document
        const docSnapshot = await getDoc(userRef);
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();;
            res.json({ ...userData });
        } else {
            //console.log("User does not exist in firestore")
            //Come back to this when Auth is set up
            const userdata = {
                userId: userId,
            }
            await setDoc(userRef, userdata, { merge: true });
            res.json({
                ...userdata
            });
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
}
)

router.post("/form", async (req, res) => {
    console.log(req.body)
    const userId = req.body.userId;
    const formId = req.body.formId;
    const userRef = doc(db, "Users", userId);

    const response = await setDoc(userRef, { completedForms: arrayUnion(formId) }, { merge: true });
    res.json({ response });

}
)

router.post('/:userId/results', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { quizTitle, score, timeSpent } = req.body;
        const userRef = doc(db, "Users", userId);
        await setDoc(userRef, { results: arrayUnion({ quizTitle, score, timeSpent }) }, { merge: true });
        console.log(`${quizTitle} added to ${userId} results array`);
        res.json({ message: `${quizTitle} added to ${userId} results array` });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
});

router.post('/:userId/store/', async (req, res) => {
    try {
        const userId = req.params.userId;
        const storeId = req.body.storeId;
        const userRef = doc(db, "Users", userId);
        //console.log("adding store to user")
        await setDoc(userRef, { store: storeId }, { merge: true });
        console.log(`${storeId} added to ${userId} store`);
        res.json({ message: `${storeId} added to ${userId} store` });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
});

router.post('/:userId/log', async (req, res) => {
    try {
        const userId = req.params.userId;
        const userRef = doc(db, "Users", userId);

        await updateDoc(userRef, {
            minutesLoggedIn: increment(1),
        }).then(() => {
            //    console.log(`Successfully logged ${user.displayName} in for 1 minute.`);
            res.json({ message: `Successfully logged ${userId} in for 1 minute.` });
        }).catch((error) => {
            console.error("Error logging user in: ", error);
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
});

export default router;