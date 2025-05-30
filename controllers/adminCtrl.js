const Payments = require("../models/paymentModel");
const Seasons = require("../models/seasonModel");
const Genres = require("../models/genreModel");
const Discounts = require("../models/dicountModel");
const Episodes = require("../models/episodeModel");
const Movies = require("../models/movieModel");
const Activities = require("../models/activityModel");
const Category = require("../models/categoryModel");
const Users = require("../models/userModel");
const Permissions = require("../models/permissionModel");
const Roles = require("../models/RoleModel");
const bcrypt = require("bcryptjs");
const generatePassword = require("generate-password");
const sendMail = require("../utils/mail");

const adminCtrl = {
  getDashboardCount: async (req, res) => {
    try {
      const filter = {};

      const categoriesCount = await Category.countDocuments(filter);
      const movieCount = await Movies.countDocuments(filter);
      const seasonsCount = await Seasons.countDocuments(filter);
      const episodeCount = await Episodes.countDocuments(filter);
      const ordersCount = await Payments.countDocuments(filter);
      const genreCount = await Genres.countDocuments(filter);
      const discountCount = await Discounts.countDocuments(filter);

      const productCount = movieCount + seasonsCount + episodeCount;

      res.json({
        data: {
          productCount: productCount,
          ordersCount: ordersCount,
          categoriesCount: categoriesCount,
          genreCount: genreCount,
          couponCount: discountCount,
        },
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  getTotalOrdersByDay: async (req, res) => {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      const groupStage = {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      };

      const sortStage = {
        $sort: { _id: 1 },
      };

      const results = await Payments.aggregate([groupStage, sortStage]);

      const finalResults = [];

      let previousCount = 0;
      for await (const result of results) {
        previousCount = result.count;
        result.loss = result.count < previousCount;
        finalResults.push(result);
      }

      res.json({
        data: results,
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  getRecentActivities: async (req, res) => {
    try {
      const activities = await Activities.find()
        .populate({
          path: "userId",
          select: "name email role",
          populate: {
            path: "role",
            select: "name",
          },
        })
        .sort({ _id: -1 })
        .limit(5);

      res.json({
        data: activities,
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  getAllActivities: async (req, res) => {
    try {
      const limit = req.query.limit || 10;
      const page = req.query.page || 1;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate)
        : new Date(1970, 0, 1);
      const endDate = req.query.endDate
        ? new Date(req.query.endDate)
        : new Date();
      const term = req.query.user || "";
      const total = await Activities.countDocuments();
      const activities = await Activities.find({
        createdAt: { $gte: startDate, $lte: endDate },
      })
        .populate([
          {
            path: "userId",
            match: {
              $or: [
                { name: { $regex: term, $options: "i" } },
                { email: { $regex: term, $options: "i" } },
              ],
            },
            select: "name email role",
            populate: {
              path: "role",
              select: "name",
            },
          },
        ])
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .limit(limit);
      res.status(200).json({
        msg: "successfully fetched Activities",
        data: { data: activities, total, page },
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  getUser: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await Users.findById(id).select(
        "-password -createdAt -updatedAt -__v -role"
      );
      if (!user) return res.status(400).json({ msg: "User does not exist." });

      res.json(user);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  makeUserAdmin: async (req, res) => {
    try {
      const { user_id } = req.body;
      const user = await Users.findByIdAndUpdate({ _id: user_id }, { role: 1 });

      res.json({
        msg: "Successfully made user an admin",
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  createPermission: async (req, res) => {
    try {
      const { title } = req.body;
      if (!title) {
        res.status(400).json({
          msg: "title is required",
        });
      }
      const permission = await Permissions.create({ permission: title });
      res.status(200).json({
        permission,
        msg: "Successfully created permission",
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  getPermissions: async (req, res) => {
    try {
      const permission = await Permissions.find({});
      res.status(200).json({
        permission,
        msg: "Successfully fetched permission",
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  createRole: async (req, res) => {
    try {
      const { permissions, name } = req.body;
      if (!name) {
        res.status(400).json({
          msg: "title is required",
        });
      }
      if (!permissions || !permissions.length > 0) {
        res.status(400).json({
          msg: "permission is required",
        });
      }
      const role = await Roles.create({ name, permissions });
      res.status(200).json({
        role,
        msg: "Successfully created role",
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  updateRole: async (req, res) => {
    try {
      const { permissions, name } = req.body;
      const id = req.params.id;
      if (!name) {
        res.status(400).json({
          msg: "title is required",
        });
      }
      if (!permissions || !permissions.length > 0) {
        res.status(400).json({
          msg: "permission is required",
        });
      }
      await Roles.findByIdAndUpdate(id, { name, permissions });
      res.status(200).json({
        msg: "Successfully updated role",
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  getRoles: async (req, res) => {
    try {
      const roles = await Roles.find().select("-permissions");
      res.status(200).json({
        roles,
        msg: "Successfully fetched roles",
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  getRoleById: async (req, res) => {
    try {
      const id = req.params.id;
      const role = await Roles.findById(id).populate("permissions");
      res.status(200).json({
        role,
        msg: "Successfully fetched role",
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  createAdmin: async (req, res) => {
    try {
      const { role, name, email } = req.body;
      if (!name) {
        res.status(400).json({
          msg: "title is required",
        });
      }
      if (!name) {
        res.status(400).json({
          msg: "name is required",
        });
      }
      if (!email) {
        res.status(400).json({
          msg: "email is required",
        });
      }
      const userRole = await Roles.findById(role);
      const password = generatePassword.generate({
        length: 10,
        numbers: true,
        symbols: true,
      });
      const passwordHash = await bcrypt.hash(password, 10);
      const data = {
        from: "info@newlabelproduction.com",
        to: email,
        subject: "Welcome to New Label Tv",
        text: "",
        html: `<!DOCTYPE html>
        <html>
        <head>
          <title>Welcome to New Label Tv</title>
        </head>
        <body>
          <h1>Welcome to New Label Tv</h1>
          <p>You've been invited to new label Tv as a(n) ${userRole.name} role</p>
          <h3>here is your default password: ${password}<h3>
          <span>NB: you are required to reset your password</span>
          <h2>Congratulations</h2>
        </body>
        </html>`,
      };
      await sendMail(data);
      const user = await Users.create({
        name,
        email,
        role,
        password: passwordHash,
        isDefaultPassword: true,
        isEmailVerified: true,
      });
      res.status(200).json({
        user,
        msg: "Successfully created user",
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  getAdmin: async (req, res) => {
    try {
      const users = await Users.find({ role: { $exists: true } })
        .select("-password -wallet -cart")
        .populate({
          path: "role",
          select: "-permissions -createdAt -updatedAt -__v",
        });
      res.status(200).json({
        users,
        msg: "Successfully fetched admins",
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  getAdminById: async (req, res) => {
    try {
      const id = req.params.id;
      const user = await Users.findById(id)
        .populate({
          path: "role",
          populate: { path: "permissions" },
        })
        .select("-password -wallet -cart");
      res.status(200).json({
        user,
        msg: "Successfully fetched user",
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  updateAdmin: async (req, res) => {
    try {
      const id = req.params.id;
      const { status } = req.body;
      await Users.findByIdAndUpdate(id, { active: status });
      res.status(200).json({
        msg: "Successfully updated Admin status",
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  getMe: async (req, res) => {
    try {
      const id = req.id;
      const data = await Users.findById(id)
        .populate({
          path: "role",
          populate: { path: "permissions" },
        })
        .select("-cart -wallet -password");
      res.status(200).json({
        msg: "Successfully retrieved admin",
        data,
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = adminCtrl;
