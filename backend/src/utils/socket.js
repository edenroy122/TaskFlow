let ioInstance = null;

const initSocket = (io) => {
    ioInstance = io;
    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId || socket.handshake.auth?.userId;
        if (userId) {
            socket.join(`user:${userId}`);
        }

        socket.on("join", (data) => {
            if (data?.userId) {
                socket.join(`user:${data.userId}`);
            }
        });
    });
};

const getIO = () => {
    return ioInstance;
};

module.exports = {
    initSocket,
    getIO
};
