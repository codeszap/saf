const firebaseConfig = {
    apiKey: "AIzaSyDSWIVfnjlzf-30H5Ydb7lYKIOMmrIHAgY",
    authDomain: "expense-902db.firebaseapp.com",
    projectId: "expense-902db"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
