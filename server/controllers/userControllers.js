const bcrypt = require('bcryptjs')
const jwt = require("jsonwebtoken")
const fs = require('fs')
const path = require('path')
const {v4: uuid} = require('uuid')


const User = require('../models/userModel')
const HttpError = require("../models/errorModel")







// ============================ REGISTER A NEW USER 
// POST : api/users/register
// UNPROTECTED




const registerUser = async (req, res, next) => {
    try {
        const {name, email, password, password2} = req.body;
        if(!name || !email || !password || !password2) {
            return next(new HttpError("Fill in all fields.", 422))
            
        }
        const newEmail = email.toLowerCase()

        const emailExists = await User.findOne({email: newEmail})
        if(emailExists){
            return next(new HttpError("Email already exists.", 422))

        }

        if((password.trim()).length < 6){
            return next(new HttpError("Password should be at least 6 characters.", 422))
            
        }

        if(password != password2){
            return next(new HttpError("Password do not match.", 422))
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPass = await bcrypt.hash(password, salt);
        const newUser = await User.create({name, email: newEmail, password: hashedPass});
        res.status(201).json(newUser)
        
    } catch (error) {
        return next(new HttpError(error.message, 422))
        
    }
}



// ============================ LOGIN A REGISTERED USER 
// POST : api/users/login
// PROTECTED


const loginUser = async (req, res, next) => {
    try {
        const {email, password} = req.body;

        if( !email || !password ) {
            return next(new HttpError("Fill in all fields.", 422))
            
        }
        const newEmail = email.toLowerCase();

        const user = await User.findOne({email: newEmail})
        if(!user){
            return next(new HttpError("User not found.", 401))
            
        }

        const comparePass = await bcrypt.compare(password, user.password)
        if(!comparePass){
            return next(new HttpError("Incorrect password.", 401))
            
        }

        const {_id: id, name} = user;
        const token = jwt.sign({id, name}, process.env.JWT_SECRET, {expiresIn: "1h"})

        res.status(201).json({token, id, name})
    } catch (error) {
        return next(new HttpError(message, 401))
        
    }
}



// ============================ USER PROFILE 
// POST : api/users/:id
// PROTECTED


const getUser = async (req, res, next) => {
    try {
        const {id} = req.params;
        const user = await User.findById(id).select('-password');
        if(!user){
            return next(new HttpError("User not found.", 404))
            
        }
        res.status(200).json(user);
        
    } catch (error) {
        return next(new HttpError(error.message, 401))
        
    }
}



// ============================ CHANGE USER AVATER 
// POST : api/users/change-avatar
// PROTECTED


const changeAvatar = async (req, res, next) => {
    try {
        if(!req.files.avatar) {
            return next(new HttpError("Please choose an image.", 422))
        }

        const user = await User.findById(req.user.id)

        if(user.avatar) {
            fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
                if(err) {
                    return next(new HttpError("Error while deleting the old avatar.", 500))
                    
                }
            })
        }

        const {avatar} = req.files;
        //check file size
        if(avatar.size > 1024 * 1024 * 5) {
            return next(new HttpError("Image size should not exceed 5MB.", 422))
            
        }

        let fileName;
        fileName = avatar.name;
        let splittedFilename = fileName.split('.')
        let newFilename = splittedFilename[0] + uuid() + '.' + splittedFilename[splittedFilename.length - 1];
        avatar.mv(path.join(__dirname, '..', 'uploads', newFilename), async (err) => {
            if(err) {
                return next(new HttpError("Error while uploading the avatar.", 500))
                
            }
            // user.avatar = newFilename;
            // await user.save(); 
            // res.status(200).json(user);
            const updateAvatar = await User.findByIdAndUpdate(req.user.id, {avatar: newFilename}, {new: true})
            if(!updateAvatar){
                return next(new HttpError("Error while updating the avatar.", 500))
                
            }
            res.status(200).json(updateAvatar)
        })
        
    } catch (error) {
        return next(new HttpError(error.message, 401))
        
    }
}



// ============================ EDIT USER DETAILS
// POST : api/users/edit-user
// PROTECTED


const editUser = async (req, res, next) => {
    res.json("Edit user details")
}



// ============================ EDIT USER DETAILS
// POST : api/users/authors
// UNPROTECTED


const getAuthors = async (req, res, next) => {
    try {
        const authors = await User.find().select('-password');
        res.json(authors);
        
    } catch (error) {
        return next(new HttpError(error.message, 401))
        
    }
}







module.exports = {registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors}