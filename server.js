const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const { connectDB, getSessionStore  } = require('./config/database');
const User = require("./models/user");
const Meeting = require("./models/meeting");
const bcrypt = require("bcrypt");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");
const passport = require('passport');
const OpenAI = require('openai');
require("dotenv").config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize passport configuration
require('./config/passport');

async function startServer() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Configure Express
        app.set("view engine", "ejs");
        app.use(express.static("public"));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Configure session middleware
        app.use(session({
          secret: process.env.SESSION_SECRET || 'your-secret-key',
          resave: false,
          saveUninitialized: false,
          store: getSessionStore(),
          cookie: {
              secure: process.env.NODE_ENV === 'production',
              maxAge: 24 * 60 * 60 * 1000
          }
      }));

        // Initialize passport
        app.use(passport.initialize());
        app.use(passport.session());

        // Middleware to make user data available to all templates
        app.use((req, res, next) => {
            res.locals.user = req.session.user || null;
            next();
        });

        // Auth routes
        app.get('/auth/google',
            passport.authenticate('google', { scope: ['profile', 'email'] })
        );

        app.get('/auth/google/callback',
            passport.authenticate('google', { failureRedirect: '/login' }),
            (req, res) => res.redirect('/home')
        );

        // Profile route
        app.get('/profile', async (req, res) => {
            if (!req.session.user) {
                return res.redirect('/login');
            }

            try {
                const meetings = await Meeting.find({
                    'participants.userId': req.session.user._id
                })
                .sort({ startTime: -1 })
                .select('link startTime endTime duration participants')
                .limit(5);

                const stats = {
                    totalMeetings: meetings.length,
                    totalDuration: meetings.reduce((acc, meeting) => acc + (meeting.duration || 0), 0),
                    averageParticipants: Math.round(meetings.reduce((acc, meeting) => 
                        acc + meeting.participants.length, 0) / (meetings.length || 1))
                };

                res.render('profile', { 
                    user: req.session.user,
                    meetings,
                    stats,
                    title: 'Profile - Chattrix',
                    formatDate: (date) => new Date(date).toLocaleDateString(),
                    formatDuration: (minutes) => `${Math.floor(minutes/60)}h ${minutes%60}m`
                });
            } catch (error) {
                console.error('Profile error:', error);
                res.status(500).send('Error loading profile');
            }
        });

        // Settings routes
        app.get('/settings', (req, res) => {
            if (!req.session.user) {
                return res.redirect('/login');
            }
            res.render('settings', { 
                user: req.session.user,
                title: 'Settings - Chattrix'
            });
        });

        // ...existing code...

// Password setting route
app.post('/setpassword', async (req, res) => {
  try {
      const { roomId, password } = req.body;
      
      // Find and update or create meeting with password
      await Meeting.findOneAndUpdate(
          { link: roomId },
          { 
              $set: { 
                  password: password,
                  isPasswordSet: true 
              }
          },
          { upsert: true }
      );

      res.json({ success: true });
  } catch (error) {
      console.error('Set password error:', error);
      res.status(500).json({ 
          success: false, 
          error: 'Failed to set password' 
      });
  }
});

// ...existing code...

        app.post('/settings', async (req, res) => {
            if (!req.session.user) {
                return res.redirect('/login');
            }

            try {
                const { name, email, language, emailNotifications } = req.body;
                
                await User.findByIdAndUpdate(req.session.user._id, {
                    name,
                    email,
                    language,
                    emailNotifications: !!emailNotifications
                });

                req.session.user = {
                    ...req.session.user,
                    name,
                    email,
                    language
                };

                res.redirect('/settings');
            } catch (error) {
                console.error('Settings update error:', error);
                res.status(500).send('Error updating settings');
            }
        });

        // Basic routes
        app.get("/", (req, res) => res.render("login"));
        app.get("/login", (req, res) => res.render("login"));
        app.get("/signup", (req, res) => res.render("signup"));
        app.get("/home", (req, res) => res.render("home"));
        app.get("/create-room", (req, res) => res.render("create-room"));
        app.get("/join-meeting", (req, res) => res.render("join-meeting", { username: req.session.username }));
        app.get("/meeting-room", (req, res) => res.render("meeting-room"));
        app.get("/aboutUs", (req, res) => res.render("aboutUs"));
        app.get("/contactUs", (req, res) => res.render("contactUs"));
        app.get("/features", (req, res) => res.render("features"));

        // Authentication routes
        app.post("/signup", async (req, res) => {
            try {
                const { username, password } = req.body;
                const hashedPassword = await bcrypt.hash(password, 10);
                const newUser = new User({ username, password: hashedPassword });
                await newUser.save();
                res.redirect("/login");
            } catch (err) {
                res.status(500).send("Error creating user");
            }
        });

        app.post("/login", async (req, res) => {
            const { username, password } = req.body;
            const user = await User.findOne({ username });

            if (user && (await bcrypt.compare(password, user.password))) {
                req.session.user = {
                    name: user.username,
                    avatar: user.avatar || "/images/user.png"
                };
                res.redirect("/home");
            } else {
                res.status(400).send("Invalid username or password");
            }
        });

        app.get("/logout", (req, res) => {
            req.session.destroy();
            res.redirect("/");
        });

        // Meeting routes
        app.get("/room", (req, res) => {
            res.redirect(`/${uuidV4()}`);
        });
        app.get("/:room", async (req, res) => {
          const roomId = req.params.room;
          if (req.query.username) {
              req.session.username = req.query.username;
          }
      
          try {
              const meeting = await Meeting.findOne({ link: roomId });
              res.render("room", {
                  roomId: roomId,
                  isPasswordSet: meeting ? meeting.isPasswordSet : false,
                  username: req.session.username || req.session.user?.name || 'Anonymous', // Add username
                  user: req.session.user // Pass the full user object
              });
          } catch (err) {
              console.error(err);
              res.status(500).send("Server error");
          }
      });

        // Socket.io connection handler
        io.on("connection", (socket) => {
            console.log("New user connected:", socket.id);

            socket.on("join-room", async (roomId, userId) => {
                socket.join(roomId);
                socket.to(roomId).emit("user-connected", userId);

                await Meeting.findOneAndUpdate(
                    { link: roomId },
                    { 
                        $push: { 
                            participants: {
                                userId,
                                joinedAt: new Date()
                            }
                        }
                    }
                );
                socket.on('chat-message', (roomId, data) => {
                  socket.to(roomId).emit('chat-message', data);
              });

                socket.on("disconnect", async () => {
                    const meeting = await Meeting.findOne({ link: roomId });
                    if (meeting) {
                        const participant = meeting.participants.find(p => 
                            p.userId.toString() === userId && !p.leftAt);
                        if (participant) {
                            participant.leftAt = new Date();
                            meeting.duration = Math.floor(
                                (participant.leftAt - participant.joinedAt) / 1000 / 60
                            );
                            await meeting.save();
                        }
                    }
                    socket.to(roomId).emit("user-disconnected", userId);
                });
            });
        });

        // Start the server
        const PORT = process.env.PORT || 3002;
        server.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();