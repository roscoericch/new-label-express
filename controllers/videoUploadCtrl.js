const path = require("path");
const fileUploadConfig =
  require("../config/file-upload-config").fileUploadConfig;
const handleDb = require("../db/handle-db");
const multer = require("multer");
const md5 = require("md5");
const fs = require("fs");
const stream = require("stream");
const Video = require("../models/videoModel");
// const uploadVideo = require("../outliers/upload-files").uploadVideo;
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const videoUpload = {
  uploadFile: async (req, res) => {
    try {
      var upload = multer(fileUploadConfig).single("user-file");
      upload(req, res, function (uploadError) {
        if (uploadError) {
          var errorMessage;
          if (uploadError.code === "LIMIT_FILE_TYPE") {
            errorMessage = uploadError.errorMessage;
          } else if (uploadError.code === "LIMIT_FILE_SIZE") {
            errorMessage =
              "Maximum file size allowed is " + process.env.FILE_SIZE + "MB";
          }
          return res.status(400).json({
            error: errorMessage,
          });
        }
        const newVideo = new Video({ link: req.file.path });
        newVideo
          .save()
          .then((link) => {
            return res.status(200).json({
              success: true,
              link: link._id,
            });
          })
          .catch((err) => {
            return res
              .status(500)
              .json({ msg: `Internal Server Error ${err.message}` });
          });
        // res.json({
        //   success: true,
        //   link: req.file.path,
        // });
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
  chunkUpload: async (req, res) => {
    try {
      const { name, currentChunkIndex, totalChunks, size } = req.query;
      const firstChunk = parseInt(currentChunkIndex) === 0;
      const lastChunk =
        parseInt(currentChunkIndex) === parseInt(totalChunks) - 1;
      const ext = name.split(".").pop();
      const data = req.body.toString().split(",")[1];
      const buffer = new Buffer(data, "base64");
      // const bufferStream = new stream.Readable();
      // bufferStream.push(buffer);
      // bufferStream.push(null);
      const tmpFilename = "tmp_" + md5(name + req.ip) + "." + ext;
      const uploadOptions = {
        resource_type: "video",
        public_id: name,
        eager: [{ streaming_profile: "hls_1080p" }],
      };
      const options = {
        // Specify the folder where you want to upload the file.
        folder: "video",

        // Use the `use_filename` option to preserve the original filename.
        use_filename: true,

        // Set the chunk size (in bytes) for large file uploads.
        chunk_size: 6000000, // 6 MB (adjust as needed)

        // Callback function to monitor progress.
        onProgress: (progress) => {
          console.log(`Progress: ${progress.percent}%`);
        },
      };
      if (firstChunk && fs.existsSync("./uploads/" + tmpFilename)) {
        fs.unlinkSync("./uploads/" + tmpFilename);
      }
      fs.appendFileSync("./uploads/" + tmpFilename, buffer);
      if (lastChunk) {
        const finalFilename = md5(Date.now()).substr(0, 6) + "." + ext;
        fs.renameSync("./uploads/" + tmpFilename, "./uploads/" + finalFilename);
        return cloudinary.uploader.upload_large(
          `./uploads/${finalFilename}`,
          uploadOptions,
          async (error, result) => {
            if (error) {
              return res.json(error.message);
            } else {
              const newVideo = new Video({ link: result.secure_url });
              fs.unlinkSync(`./uploads/${finalFilename}`);
              return await newVideo
                .save()
                .then((link) => {
                  return res.status(200).json({
                    msg: "file uploaded successfully",
                    link: link._id,
                  });
                })
                .catch((err) => {
                  // console.log(err);
                });
            }
          }
        );
      } else {
        res.json("ok");
      }
    } catch (err) {
      fs.unlinkSync("./uploads/" + tmpFilename);
      fs.unlinkSync(`./uploads/${finalFilename}`);
      res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = videoUpload;
