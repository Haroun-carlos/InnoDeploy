const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "developer", "viewer"],
      default: "developer",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    deactivatedAt: {
      type: Date,
      default: null,
    },

    deactivatedReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
      default: null,
    },

    recoveryEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$|^$/, "Please provide a valid recovery email"],
    },

    recoveryPhone: {
      type: String,
      default: null,
    },

    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-1000", "1000+", ""],
      default: "",
    },

    useCase: {
      type: String,
      enum: ["startups", "enterprise", "agencies", "freelance", ""],
      default: "",
    },

    referralSource: {
      type: String,
      enum: ["search", "social-media", "friend-referral", "conference", "content", "other", ""],
      default: "",
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: {
      type: String,
      default: null,
      select: false,
    },

    newsletter: {
      type: Boolean,
      default: true,
    },

    avatar: {
      type: String,
      default: null,
    },

    github: {
      username: {
        type: String,
        default: null,
      },
      accessToken: {
        type: String,
        default: null,
        select: false,
      },
      connectedAt: {
        type: Date,
        default: null,
      },
    },

    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      language: {
        type: String,
        enum: ["english", "french", "arabic"],
        default: "english",
      },

      defaultProject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        default: null,
      },

      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        slack: {
          type: Boolean,
          default: false,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
    },
  },
  { timestamps: true }
);

// ── Pre-save hook: hash password before persisting ────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
  next();
});

// ── Instance method: compare candidate password ───────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);