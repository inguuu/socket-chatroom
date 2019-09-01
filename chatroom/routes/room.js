var express = require('express');
var router = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const resMessage = require('../module/utils/responseMessage');

const Room = require('../schemas/room');

router.post('/room', async (req, res, next) => {// 룸 생성하기
    try {
        const room = new Room({
            title: req.body.title,
            max: req.body.max,
            owner: req.session.color,
            password: req.body.password,
        });
        const newRoom = await room.save();// 집어넣기 그대로 
        const io = req.app.get('io');
        io.of('/room').emit('newRoom', newRoom);

    } catch (error) {
        console.error(error);
        next(error);
    }
});


router.get('/room/:id', async (req, res, next) => {
    try {
        const room = await Room.findOne({ _id: req.params.id });
        const io = req.app.get('io');
        if (!room) {// 방이 없을시 
            res.status(200).send(defaultRes.successFalse(statusCode.OK, resMessage.NOT_FOUND_ROOM));
        }
        else if (room.password && room.password !== req.query.password) { // 비밀번호가 틀렸으면
            res.status(200).send(defaultRes.successFalse(statusCode.OK, resMessage.NOT_CORRECT_PW));
        }
        else { //성공 
            const { rooms } = io.of('/chat').adapter;
            if (rooms && rooms[req.params.id] && room.max <= rooms[req.params.id].length) {
                res.status(200).send(defaultRes.successFalse(statusCode.OK, resMessage.NOT_CORRECT_USERINFO));

            }

            const chats = await Chat.find({ room: room._id }).sort('createdAt');
            return res.render('chat', {
                room,
                title: room.title,
                chats,
                user: req.session.color,
            });
        }

    } catch (error) {
        console.error(error);
        return next(error);
    }
});

router.delete('/room/:id', async (req, res, next) => {
    try {
        await Room.remove({ _id: req.params.id });

        res.status(200).send(defaultRes.successFalse(statusCode.OK, resMessage.SUCCESS_DELETE_ROOM));
        setTimeout(() => {
            req.app.get('io').of('/room').emit('removeRoom', req.params.id);
        }, 2000);
    } catch (error) {
        console.error(error);
        next(error);
    }
});
module.exports = router;