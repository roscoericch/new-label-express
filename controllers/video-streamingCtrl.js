const path = require("path");
const fs = require("fs");
const Video = require("../models/videoModel");
const cloudinary = require("cloudinary").v2;
const cloudinaryUtils = require("cloudinary").utils;
const Payments = require("../models/paymentModel");

const cache = {}; // cache to store video data

const videoStreamCtrl = {
  sendVideoFile: async (req, res) => {
    try {
      const file_name = await Video.findById(req.params.file_name);
      const path = `./uploads/${file_name.link}.mp4`;
      const stat = fs.statSync(path);
      const fileSize = stat.size;
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const file = fs.createReadStream(path, { start, end });
        const head = {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": "video/mp4",
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          "Content-Length": fileSize,
          "Content-Type": "video/mp4",
        };
        res.writeHead(206, head);
        fs.createReadStream(path).pipe(res);
      }
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  streamVideo: async (req, res) => {
    try {
      const range = req.headers.range;
      if (!range) {
        res.status(400).json({ msg: "Requires Range header" });
      }
      const videoPath = `./uploads/${req.params.file_name}.mp4`;
      const videoSize = fs.statSync(videoPath).size;
      const CHUNK_SIZE = 1000000; // 1 MB
      const start = Number(range.replace(/\D/g, ""));
      const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
      const contentLength = end - start + 1;
      const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
      };
      res.writeHead(206, headers);
      const videoStream = fs.createReadStream(videoPath, { start, end });
      videoStream.pipe(res);
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  sendVideoUrl: async (req, res) => {
    try {
      const userId = req.id;
      const media = req.body.item;
      if (!req.params.id)
        return res.status(400).json({ msg: "video id is undefined" });
      const video = await Video.findById(req.params.id);
      const options = {
        secure: true,
        expires_at: Math.floor(Date.now() / 1000) + 43200, // URL expiration time in seconds (12 hours)
        resource_type: "video",
        type: "private",
        // streaming_profile: "hls_1080p",
      };
      const signedUrl = cloudinaryUtils.private_download_url(
        video.link,
        "mp4",
        options
      );
      const paymentInstance = await Payments.findOne({
        user: userId,
        item: media,
      });
      if (paymentInstance?.validViews)
        await Payments.findOneAndUpdate(
          { _id: paymentInstance._id },
          { validViews: paymentInstance.validViews - 1 }
        );
      return res.status(200).json({ msg: "success", url: video.link });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = videoStreamCtrl;
