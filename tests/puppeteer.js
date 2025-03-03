const puppeteer = require("puppeteer");
require("../app");
const { seed_db, testUserPassword } = require("../util/seed_db");
const Job = require("../models/Job");

let testUser = null;
let page = null;
let browser = null;

// Launch the browser and open a new blank page
describe("jobs-ejs puppeteer test", function () {
  before(async function () {
    this.timeout(10000);
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.goto("http://localhost:3000");
  });

  after(async function () {
    this.timeout(5000);
    await browser.close();
  });

  describe("got to site", function () {
    it("should have completed a connection", async function () {});
  });

  describe("index page test", function () {
    this.timeout(10000);
    it("finds the index page logon link", async () => {
      this.logonLink = await page.waitForSelector(
        "a ::-p-text(Click this link to logon)"
      );
    });
    it("gets to the logon page", async () => {
      await this.logonLink.click();
      await page.waitForNavigation();
      const email = await page.waitForSelector('input[name="email"]');
    });
  });

  describe("logon page test", function () {
    this.timeout(20000);
    it("resolves all the fields", async () => {
      this.email = await page.waitForSelector('input[name="email"]');
      this.password = await page.waitForSelector('input[name="password"]');
      this.submit = await page.waitForSelector("button ::-p-text(Logon)");
    });

    it("sends the logon", async () => {
      testUser = await seed_db();
      await this.email.type(testUser.email);
      await this.password.type(testUserPassword);
      await this.submit.click();
      await page.waitForNavigation();
      await page.waitForSelector(`p ::-p-text(${testUser.name} is logged on.)`);
      await page.waitForSelector("a ::-p-text(change the secret)");
      await page.waitForSelector('a[href="/secretWord"]');
      const copyr = await page.waitForSelector("p ::-p-text(copyright)");
      const copyrText = await copyr.evaluate((el) => el.textContent);
      console.log("copyright text: ", copyrText);
    });
  });

  describe("puppeteer job operations", function () {
    this.timeout(30000);

    //test1: Verify job list and verify 20 job entries.
    it("should navigate to the jobs list and verify 20 entries", async function () {
      const { expect } = await import("chai");

      // Find the link for the jobs list
      const jobsLink = await page.waitForSelector('a[href="/jobs"]');
      expect(jobsLink).to.not.be.undefined;
      await jobsLink.click();
      await page.waitForNavigation();

      const content = await page.content();
      const parts = content.split("<tr>");
      expect(parts.length).to.equal(21);
    });

    //test2: verify expected form when clicking "Add A Job" button.
    it("should open the add job form and verify expected fields", async function () {
      const { expect } = await import("chai");

      const createJobLink = await page.waitForSelector('a[href="/jobs/new"]');
      expect(createJobLink).to.not.be.undefined;
      await createJobLink.click();
      await page.waitForNavigation();

      const companyInput = await page.waitForSelector('input[name="company"]');
      const positionInput = await page.waitForSelector(
        'input[name="position"]'
      );
      const submitButton = await page.waitForSelector(
        "button ::-p-text(Edit job)"
      );
      expect(companyInput).to.not.be.null;
      expect(positionInput).to.not.be.null;
      expect(submitButton).to.not.be.null;
    });

    //test3: Fill out the add job form, submit it, verify a confirmation message, and check the database.
    it("should add a job entry and verify it was added", async function () {
      const { expect } = await import("chai");
      const company = "Google";
      const position = "Backend developer";

      const companyInput = await page.waitForSelector('input[name="company"]');
      const positionInput = await page.waitForSelector(
        'input[name="position"]'
      );
      await companyInput.click({ clickCount: 3 });
      await companyInput.type(company);
      await positionInput.click({ clickCount: 3 });
      await positionInput.type(position);
      const submitButton = await page.waitForSelector(
        "button ::-p-text(Edit job)"
      );
      expect(submitButton).to.not.be.null;
      await submitButton.click();
      await page.waitForNavigation();

      const content = await page.content();
      expect(content).to.include("Job listing has been added");

      const jobs = await Job.find({ createdBy: testUser._id });
      expect(jobs.length).to.equal(21);
      const latestJob = jobs[jobs.length - 1];
      expect(latestJob.company).to.equal(company);
      expect(latestJob.position).to.equal(position);
    });
  });
});
