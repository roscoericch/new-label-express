const Seasons = require("../models/seasonModel");
const Series = require("../models/seriesModel");
const Activities = require("../models/activityModel");

class APIfeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  filtering() {
    const queryObj = { ...this.queryString }; //queryString = req.query

    const excludedFields = ["page", "sort", "limit"];
    excludedFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lt|lte|regex)\b/g,
      (match) => "$" + match
    );

    //    gte = greater than or equal
    //    lte = lesser than or equal
    //    lt = lesser than
    //    gt = greater than
    this.query.find(JSON.parse(queryStr));

    return this;
  }

  sorting() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }

    return this;
  }

  paginating() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 9;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

const seasonCtrl = {
  getSeasons: async (req, res) => {
    try {
      const features = new APIfeatures(
        Seasons.find()
          .populate({
            path: "episodes",
            select: "-video",
            populate: {
              path: "trailer",
            },
          })
          .sort({ _id: 1 }),
        req.query
      )
        .filtering()
        .sorting()
        .paginating();

      const seasons = await features.query;

      res.json({
        status: "success",
        result: seasons.length,
        seasons: seasons,
        currency: req.currency,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  createSeason: async (req, res) => {
    try {
      const {
        title,
        description,
        image,
        trailer,
        banner,
        episodes,
        series,
        price,
        free,
        expirationSpan,
        validViews,
      } = req.body;
      if (!image || !trailer || !banner)
        return res.status(400).json({ msg: "Asset upload not complete" });
      if (!series) return res.status(400).json({ msg: "Provide series" });
      const newSeason = new Seasons({
        title: title.toLowerCase(),
        description,
        image,
        trailer,
        banner,
        episodes,
        series,
        price,
        free,
        expirationSpan,
        validViews,
      });

      const newActivities = new Activities({
        description: `Successfully created season ${title}`,
        userId: req.id,
      });

      await newActivities.save();

      await newSeason
        .save()
        .then((newSeason) => {
          Series.findByIdAndUpdate(
            { _id: series },
            { $push: { seasons: newSeason._id } },
            { new: true }
          )
            .then(() => {
              return res
                .status(200)
                .json({ msg: "successfully created an season" });
            })
            .catch((err) => {
              return res.status(400).json({ msg: err.message });
            });
        })
        .catch((err) => {
          return res.status(400).json({ msg: err.message });
        });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  getSeason: async (req, res) => {
    try {
      const season = await Seasons.findById(req.params.id).populate([
        {
          path: "episodes",
          select: "-video",
          populate: {
            path: "trailer",
          },
        },
      ]);
      if (!season)
        return res.status(400).json({ msg: "Seasons does not exist." });

      res.json({ ...season, currency: req.currency });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  getSeriesSeason: async (req, res) => {
    try {
      const season = await Seasons.find({
        series: req.params.id,
      }).populate({
        path: "episodes",
        select: "-video",
      });
      if (!season)
        return res.status(400).json({ msg: "Seasons does not exist." });

      res.json({ msg: "success", seasons: season, currency: req.currency });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  deleteSeason: async (req, res) => {
    try {
      const season = await Seasons.findByIdAndDelete({ _id: req.params.id });
      const newActivities = new Activities({
        description: `Successfully deleted season with title ${season.title}`,
      });

      await newActivities.save();

      res.json({ msg: "Deleted a Season" });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  updateSeason: async (req, res) => {
    try {
      const {
        title,
        description,
        image,
        trailer,
        banner,
        episodes,
        series,
        price,
        free,
        expirationSpan,
        validViews,
      } = req.body;

      const season = await Seasons.findOneAndUpdate(
        { _id: req.params.id },
        {
          title: title.toLowerCase(),
          description,
          image,
          trailer,
          banner,
          episodes,
          series,
          price,
          free,
          expirationSpan,
          validViews,
        }
      );

      const newActivities = new Activities({
        description: `Successfully updated season with title ${season.title}`,
      });

      await newActivities.save();

      res.json({ msg: "Updated a Season" });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = seasonCtrl;
