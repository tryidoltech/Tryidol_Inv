const User = require("../models/user.model");

const { ApiError } = require("../utils/ApiError.js");
const { ApiResponse } = require("../utils/ApiResponse.js");
const { catchAsyncErrors } = require("../middlewares/catchAsyncErrors.js");

// ?? Admin Register Handler
exports.registerUser = catchAsyncErrors(async (req, res) => {
  const { name, password, email, role } = req.body;

  if ([name, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with same email or contact already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "user",
  });

  const createdUser = await User.findById(user._id).select("-password");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  const token = await user.getJwtToken();

  const options = {
    expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    // secure: true,
  };

  return res
    .status(201)
    .cookie("token", token, options)
    .json(new ApiResponse(200, token, "User registered Successfully"));
});

exports.loginAdmin = catchAsyncErrors(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new ApiError(400, "Username and password are required");
  }

  // Fetch the user and include the password field in the query
  const user = await User.findOne({ email: email }).select("+password");

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // Compare the provided password with the stored hashed password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Generate JWT token
  const token = await user.getJwtToken();

  const options = {
    expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  const userWithoutPassword = { ...user.toObject() };
  delete userWithoutPassword.password;

  return res
    .status(200)
    .cookie("token", token, options)
    .json(
      new ApiResponse(
        200,
        {
          token,
          user: userWithoutPassword,
        },
        "User logged in successfully"
      )
    );
});

exports.myProfile = catchAsyncErrors(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  res.status(200).json(new ApiResponse(200, { success: true, user }));
});
