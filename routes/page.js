
import { Router } from "express";
import { db } from "../firebase.js";
import { getDocs, collection, query, where, addDoc, setDoc, doc, updateDoc } from "firebase/firestore";
import { tokenValidator } from "../service/user.service.js";

const router = Router(); // Create an instance of the Router
//Create an object to store the data in memory
const pageData = {};
//Create a timeout function to clear old data from memory every hour
setInterval(() => {
    console.log('Running Batch Deletion at ' + Date.now())
    for (const key in pageData) {
        if (Date.now() - pageData[key].time > 300000) {
            console.log(`Deleting ${key} from memory`)
            delete pageData[key];
        }
    }
}, 3600000);

router.get("/:link", tokenValidator, async (req, res) => {
    try {
        const link = req.params.link.split('|').filter(item => item !== '').map(item => item.toLowerCase());
        //check if the data is already in memory and it isn't older than 5 minutes
        if (pageData[link] && Date.now() - pageData[link].time < 300000) {
            //if it is, send it back
            //console.log(`Page data found in memory for ${link}`);
            res.json(pageData[link]);
        } else {
            if (pageData[link]) {
                delete pageData[link]
                //console.log(`Page data found in memory but too old for ${link}`);
            } else {
                //console.log(`Page data not found in memory for ${link}`);
            }
            const pagesRef = collection(db, 'Pages'); // Replace 'db' with your Firestore instance
            const q = query(pagesRef, where('link', '==', link));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                res.status(404).json({ error: 'Page not found' });
            } else {
                const section = querySnapshot.docs[0].data().section;
                pageData[link] = { section: section, time: Date.now() }
                res.status(200).json({ section });
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
}
)

router.post("/:link/section", async (req, res) => {
    try {
        const link = req.params.link.split('|').filter(item => item !== '').map(item => item.toLowerCase());
        const itemProps = req.body;
        const pagesRef = collection(db, 'Pages');
        const q = query(pagesRef, where('link', '==', link));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.log('No matching documents.');
            const linkString = link.join('_');
            console.log(linkString)
            await setDoc(doc(db, "Pages", linkString), {
                link,
                section: [itemProps]
            });


            res.json({ message: 'Page created' });
        } else {
            console.log('Matching document.');
            const doc = querySnapshot.docs[0];
            const existingSection = doc.data().section;

            // Make sure existingSection is an array
            const updatedSection = Array.isArray(existingSection)
                ? [...existingSection, itemProps]
                : [itemProps];

            const docRef = doc.ref; // Get the reference to the existing document
            await updateDoc(docRef, {
                section: updatedSection,
            });
            res.json({ message: 'Page updated' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
})


export default router;