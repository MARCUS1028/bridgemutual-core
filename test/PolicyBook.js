const PolicyBook = artifacts.require("PolicyBook");
// const { catchRevert } = require("./helpers/ExceptionCatcher")

contract("PolicyBook", async () =>
{    
    let deployed;

    beforeEach('setup', async () =>
    {
        deployed = await PolicyBook.new();
    });

    describe("getQuote()", async () =>
    {
        const days = 100;
        const myMoney = 100000;

        it("calculating persentage should equals to ...", async () =>
        {            
            const p = (await deployed.getQuote(days, myMoney)).toNumber();

            console.log(p);
        });
    });

    // describe("setPrice()", async () =>
    // {                
    //     await catchRevert();
    // });
});