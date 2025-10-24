// const User = require('../Models/signupModels');
// const bcrypt = require('bcrypt');

// exports.registerUser = (req, res) => {
//     const { username, email, phonenumber, password, confirmpassword } = req.body;

//     if (password !== confirmpassword) {
//         return res.status(400).json({ message: "Passwords do not match" });
//     }

//     User.findOne({
//         $or: [
//             { email: email.toLowerCase() },
//             { username: username.toLowerCase() },
//             { phonenumber }
//         ]
//     })
//     .then(existingUser => {
//         if (existingUser) {
//             return res.status(400).json({ message: "User already exists" });
//         }

//         return bcrypt.hash(password, 10);
//     })
//     .then(hashedPassword => {
//         const newUser = new User({
//             username: username.toLowerCase(),
//             email: email.toLowerCase(),
//             phonenumber,
//             password: hashedPassword
//         });

//         return newUser.save();
//     })
//     .then(newUser => {
//         console.log("User registered:", newUser);
//         res.status(201).json({ message: "User registered successfully" });
//     })
//     .catch(err => {
//         console.error("Registration error:", err);
//         res.status(500).json({ message: "Database error", error: err.message });
//     });
// };

// exports.loginUser = (req, res) => {
//     const { username, password } = req.body;

//     console.log(" Received login request for username:", username);

//     User.findOne({ username: username.toLowerCase() })
//     .then(user => {
//         if (!user) {
//             console.log(" User not found in database:", username);
//             return res.status(400).json({ message: "User not found" });
//         }

//         console.log("User found:", user);
//         return bcrypt.compare(password, user.password).then(match => ({ user, match }));
//     })
//     .then(({ user, match }) => {
//         if (!match) {
//             console.log("Invalid password for:", username);
//             return res.status(400).json({ message: "Invalid password" });
//         }

//         res.status(200).json({ message: "Login successful", user });
//     })
//     .catch(err => {
//         console.error(" Database error:", err);
//         res.status(500).json({ message: "Database error", error: err.message });
//     });
// };
