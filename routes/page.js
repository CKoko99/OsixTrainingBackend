
import { Router } from "express";
import { db } from "../firebase.js";
import { getDocs, collection, query, where, addDoc, doc, updateDoc } from "firebase/firestore";

const router = Router(); // Create an instance of the Router

router.get("/:link", async (req, res) => {
    console.log(req.params.link)
    const link = req.params.link.split('|').filter(item => item !== '').map(item => item.toLowerCase());
    const pagesRef = collection(db, 'Pages'); // Replace 'db' with your Firestore instance
    const q = query(pagesRef, where('link', '==', link));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        console.log('No matching documents.');
        res.status(404).json({ error: 'Page not found' });
    } else {
        const section = querySnapshot.docs[0].data().section;
        res.json({ section });
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
            await addDoc(collection(db, 'Pages'), {
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