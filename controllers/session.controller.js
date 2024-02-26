import { getFirebaseUser, getGoogleOauthTokens, getGoogleUser } from "../service/user.service.js";

export async function googleOauthHandler(req, res) {
    try {
        //get the 'code' query parameter
        const code = req.query.code;
        console.log(req.query)
        const origin = req.query.urlOrigin;
        // get the id and access tokens with the code
        const { id_token, access_token } = await getGoogleOauthTokens(code);
        //console.log(id_token, access_token)

        const googleUser = await getGoogleUser(id_token, access_token);
        if (googleUser.hd !== "getaiu.com"
            || googleUser.hd !== "insurehut.com"
        ) {
            res.status(401).json({ error: "You must use a getaiu.com or insurehut.com email address to log in" })
        }

        console.log("getting firebase user")
        console.log(await getFirebaseUser(googleUser.id, googleUser.name))
        console.log(origin)
        res.redirect(`${origin}`)
        return
        // get user with tokens
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });
        const { data } = await oauth2.userinfo.get();
        const { id, email, given_name, family_name, picture } = data;
        //check if user exists in firestore
        const userRef = doc(db, "Users", id);
        const docSnapshot = await getDoc(userRef);
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            //console.log(userData)
            res.json({ ...userData });
        }
        else {
            //console.log("User does not exist in firestore")
            //Come back to this when Auth is set up
            await setDoc(userRef, {
                displayName: `${given_name} ${family_name}`,
                email,
                photoURL: picture
            });
            res.json({ userData: { displayName: `${given_name} ${family_name}`, email, photoURL: picture } });
        }
    } catch (error) {
    }
}