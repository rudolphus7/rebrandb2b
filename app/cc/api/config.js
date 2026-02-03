module.exports = (req, res) => {
    res.status(200).json({
        appId: process.env.FB_APP_ID,
        pageId: process.env.FB_PAGE_ID,
        // Do NOT return secret tokens to the client
    });
};
