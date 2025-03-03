const { app } = require("../app");
const Job = require("../models/Job");
const { seed_db, testUserPassword, factory } = require("../util/seed_db");
const get_chai = require("../util/get_chai");

before(async () => {
  const { expect, request } = await get_chai();
  this.test_user = await seed_db();
  let req = request.execute(app).get("/session/logon").send();
  let res = await req;
  const textNoLineEnd = res.text.replaceAll("\n", "");
  this.csrfToken = /_csrf\" value=\"(.*?)\"/.exec(textNoLineEnd)[1];
  let cookies = res.headers["set-cookie"];
  this.csrfCookie = cookies.find((element) => element.startsWith("csrfToken"));
  const dataToPost = {
    email: this.test_user.email,
    password: testUserPassword,
    _csrf: this.csrfToken,
  };
  req = request
    .execute(app)
    .post("/session/logon")
    .set("Cookie", this.csrfCookie)
    .set("content-type", "application/x-www-form-urlencoded")
    .redirects(0)
    .send(dataToPost);
  res = await req;
  cookies = res.headers["set-cookie"];
  this.sessionCookie = cookies.find((element) =>
    element.startsWith("connect.sid")
  );
  expect(this.csrfToken).to.not.be.undefined;
  expect(this.sessionCookie).to.not.be.undefined;
  expect(this.csrfCookie).to.not.be.undefined;

  // Test to verify the job list page (seed_db creates 20 job entries)
  it("should get the job list with 20 job entries", async () => {
    const { expect, request } = await get_chai();
    const req = request
      .execute(app)
      .get("/jobs")
      .set("Cookie", this.sessionCookie)
      .send();
    const res = await req;
    expect(res).to.have.status(200);
    // Splitting on "<tr>" should result in 21 parts (header row + 20 job rows)
    const pageParts = res.text.split("<tr>");
    expect(pageParts.length).to.equal(21);
  });

  // Test to add a new job entry and verify that there are now 21 jobs for the user.
  it("should add a job entry", async () => {
    const { expect, request } = await get_chai();
    const jobData = await factory.build("job");

    // Build data for the job form, including _csrf
    const dataToPost = {
      title: jobData.title,
      description: jobData.description,
      // include other necessary job fields if required by your form...
      _csrf: this.csrfToken,
    };

    const req = request
      .execute(app)
      .post("/jobs")
      // Combine the CSRF cookie and session cookie in one header as required
      .set("Cookie", this.csrfCookie + ";" + this.sessionCookie)
      .set("content-type", "application/x-www-form-urlencoded")
      .send(dataToPost);
    const res = await req;
    // For success, you could check for a redirect or status 200 as your application does.
    expect(res).to.have.status(200);

    // Verify that the DB now has 21 job entries for the seeded user.
    const jobs = await Job.find({ createdBy: this.test_user._id });
    expect(jobs.length).to.equal(21);
  });
});
