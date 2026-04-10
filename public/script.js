let currentUser = null;

const ROUTES = {
  "/": "home-page",
  "/register": "register-page",
  "/verify-email": "verify-email-page",
  "/login": "login-page",
  "/profile": "profile-page",
  "/requests": "requests-page",
  "/accounts": "accounts-page",
  "/departments": "departments-page",
  "/employees": "employees-page",
};

const PROTECTED_ROUTES = ["/profile", "/requests"];
const ADMIN_ROUTES = ["/accounts", "/departments", "/employees"];
const STORAGE_KEY = "lab2_frontend_prototype";
const AUTH_KEY = "lab2_current_user";

function $(id) {
  return document.getElementById(id);
}

function navigateTo(hash) {
  window.location.hash = hash || "#/";
}

function saveToStorage() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function loadFromStorage() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw) {
    window.db = JSON.parse(raw);
    return;
  }

  window.db = {
    nextId: { account: 3, department: 3, employee: 1, request: 1 },
    accounts: [
      {
        id: 1,
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        password: "Password123!",
        role: "Admin",
        verified: true,
      },
      {
        id: 2,
        firstName: "Sample",
        lastName: "User",
        email: "user@example.com",
        password: "Password123!",
        role: "User",
        verified: true,
      },
    ],
    departments: [
      { id: 1, name: "Engineering", description: "Software team" },
      { id: 2, name: "HR", description: "Human Resources" },
    ],
    employees: [],
    requests: [],
  };

  saveToStorage();
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  $("toastContainer").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function persistCurrentUser() {
  if (currentUser) {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
  } else {
    sessionStorage.removeItem(AUTH_KEY);
  }
}

function setAuthState(isAuth, user = null) {
  currentUser = isAuth ? user : null;
  persistCurrentUser();

  document.body.classList.remove("authenticated", "not-authenticated", "is-admin");
  document.body.classList.add(isAuth ? "authenticated" : "not-authenticated");

  if (isAuth && user && user.role === "Admin") {
    document.body.classList.add("is-admin");
  }

  $("navUsername").textContent = isAuth ? `${user.firstName} (${user.role})` : "User";
}

function initAuthFromStorage() {
  const raw = sessionStorage.getItem(AUTH_KEY);
  if (!raw) {
    setAuthState(false);
    return;
  }

  try {
    const stored = JSON.parse(raw);
    const account = window.db.accounts.find((item) => item.id === stored.id);
    if (account) {
      setAuthState(true, account);
      return;
    }
  } catch (error) {
    // Reset auth below.
  }

  setAuthState(false);
}

function handleRouting() {
  const hash = (window.location.hash || "#/").slice(1).split("?")[0];
  const pageId = ROUTES[hash] || "home-page";
  const isProtected = PROTECTED_ROUTES.includes(hash);
  const isAdminRoute = ADMIN_ROUTES.includes(hash);

  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));

  if (isProtected && !currentUser) {
    navigateTo("#/login");
    return;
  }

  if (isAdminRoute && (!currentUser || currentUser.role !== "Admin")) {
    navigateTo(currentUser ? "#/profile" : "#/login");
    showToast("Access denied. Admin only.", "error");
    return;
  }

  ($(pageId) || $("home-page")).classList.add("active");

  if (hash === "/profile") renderProfile();
  if (hash === "/requests") renderRequestsList();
  if (hash === "/accounts") renderAccountsList();
  if (hash === "/departments") renderDepartmentsList();
  if (hash === "/employees") renderEmployeesList();
  if (hash === "/verify-email") {
    $("verifyEmail").textContent = sessionStorage.getItem("unverified_email") || "";
  }

  const loginSuccessMessage = $("loginSuccessMessage");
  if (hash === "/login" && sessionStorage.getItem("emailVerified") === "1") {
    loginSuccessMessage.hidden = false;
    sessionStorage.removeItem("emailVerified");
  } else {
    loginSuccessMessage.hidden = true;
  }
}

function renderProfile() {
  if (!currentUser) {
    return;
  }

  $("profileContent").innerHTML = `
    <p><strong>${currentUser.firstName} ${currentUser.lastName}</strong></p>
    <p>Email: ${currentUser.email}</p>
    <p>Role: ${currentUser.role}</p>
    <button class="btn btn-primary" id="editProfileBtn" type="button">Edit Profile</button>
  `;

  $("editProfileBtn").addEventListener("click", () => {
    showToast("Edit profile is not part of this prototype yet.", "info");
  });
}

function renderAccountsList() {
  const accounts = window.db.accounts || [];
  $("accountsTable").innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Verified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${
            accounts.length === 0
              ? "<tr><td colspan='5'>No accounts.</td></tr>"
              : accounts.map((account) => `
                  <tr>
                    <td>${account.firstName} ${account.lastName}</td>
                    <td>${account.email}</td>
                    <td>${account.role}</td>
                    <td>${account.verified ? "Yes" : "No"}</td>
                    <td>
                      <button class="btn-link btn-link-edit" data-edit="${account.id}" type="button">Edit</button>
                      <button class="btn-link btn-link-reset" data-reset="${account.id}" type="button">Reset Password</button>
                      <button class="btn-link btn-link-delete" data-delete="${account.id}" type="button">Delete</button>
                    </td>
                  </tr>
                `).join("")
          }
        </tbody>
      </table>
    </div>
  `;

  $("accountsTable").querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editAccount(Number(button.dataset.edit)));
  });
  $("accountsTable").querySelectorAll("[data-reset]").forEach((button) => {
    button.addEventListener("click", () => resetPassword(Number(button.dataset.reset)));
  });
  $("accountsTable").querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteAccount(Number(button.dataset.delete)));
  });
}

function editAccount(id) {
  const account = window.db.accounts.find((item) => item.id === id);
  if (!account) {
    return;
  }

  $("accountId").value = String(account.id);
  $("accFirstName").value = account.firstName;
  $("accLastName").value = account.lastName;
  $("accEmail").value = account.email;
  $("accPassword").value = "";
  $("accRole").value = account.role;
  $("accVerified").checked = account.verified;
  $("accountFormSection").hidden = false;
}

function resetPassword(id) {
  if (id === currentUser?.id) {
    showToast("Use your own profile flow to reset your password.", "warning");
    return;
  }

  const password = window.prompt("Enter new password (minimum 6 characters):");
  if (!password || password.length < 6) {
    showToast("Password must be at least 6 characters.", "error");
    return;
  }

  const account = window.db.accounts.find((item) => item.id === id);
  if (!account) {
    return;
  }

  account.password = password;
  saveToStorage();
  showToast("Password reset.", "success");
}

function deleteAccount(id) {
  if (id === currentUser?.id) {
    showToast("You cannot delete your own account.", "error");
    return;
  }

  if (!window.confirm("Delete this account?")) {
    return;
  }

  window.db.accounts = window.db.accounts.filter((item) => item.id !== id);
  saveToStorage();
  showToast("Account deleted.", "success");
  renderAccountsList();
}

function renderDepartmentsList() {
  const departments = window.db.departments || [];
  $("departmentsTable").innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${
            departments.length === 0
              ? "<tr><td colspan='3'>No departments.</td></tr>"
              : departments.map((department) => `
                  <tr>
                    <td>${department.name}</td>
                    <td>${department.description || "-"}</td>
                    <td>
                      <button class="btn-link btn-link-edit" data-edit-dept="${department.id}" type="button">Edit</button>
                      <button class="btn-link btn-link-delete" data-delete-dept="${department.id}" type="button">Delete</button>
                    </td>
                  </tr>
                `).join("")
          }
        </tbody>
      </table>
    </div>
  `;

  $("departmentsTable").querySelectorAll("[data-edit-dept]").forEach((button) => {
    button.addEventListener("click", () => editDepartment(Number(button.dataset.editDept)));
  });
  $("departmentsTable").querySelectorAll("[data-delete-dept]").forEach((button) => {
    button.addEventListener("click", () => deleteDepartment(Number(button.dataset.deleteDept)));
  });
}

function editDepartment(id) {
  const department = window.db.departments.find((item) => item.id === id);
  if (!department) {
    return;
  }

  const newName = window.prompt("Department name:", department.name);
  if (!newName || !newName.trim()) {
    return;
  }

  const description = window.prompt("Department description:", department.description || "") || "";
  department.name = newName.trim();
  department.description = description.trim();
  saveToStorage();
  showToast("Department updated.", "success");
  renderDepartmentsList();
}

function deleteDepartment(id) {
  if (!window.confirm("Delete this department?")) {
    return;
  }

  window.db.departments = window.db.departments.filter((item) => item.id !== id);
  saveToStorage();
  showToast("Department deleted.", "success");
  renderDepartmentsList();
  renderEmployeesList();
}

function getAccountEmailForEmployee(userId) {
  return window.db.accounts.find((item) => item.id === userId)?.email || "";
}

function renderEmployeesList() {
  const employees = window.db.employees || [];
  const departments = window.db.departments || [];
  const getDepartmentName = (id) => departments.find((item) => item.id === id)?.name || "-";

  $("employeesTable").innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Position</th>
            <th>Department</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${
            employees.length === 0
              ? "<tr><td colspan='5'>No employees.</td></tr>"
              : employees.map((employee) => `
                  <tr>
                    <td>${employee.employeeId}</td>
                    <td>${getAccountEmailForEmployee(employee.userId)}</td>
                    <td>${employee.position}</td>
                    <td>${getDepartmentName(employee.deptId)}</td>
                    <td>
                      <button class="btn-link btn-link-edit" data-edit-employee="${employee.id}" type="button">Edit</button>
                      <button class="btn-link btn-link-delete" data-delete-employee="${employee.id}" type="button">Delete</button>
                    </td>
                  </tr>
                `).join("")
          }
        </tbody>
      </table>
    </div>
  `;

  $("employeesTable").querySelectorAll("[data-edit-employee]").forEach((button) => {
    button.addEventListener("click", () => editEmployee(Number(button.dataset.editEmployee)));
  });
  $("employeesTable").querySelectorAll("[data-delete-employee]").forEach((button) => {
    button.addEventListener("click", () => deleteEmployee(Number(button.dataset.deleteEmployee)));
  });

  $("empDept").innerHTML = departments.map((department) => `<option value="${department.id}">${department.name}</option>`).join("");
}

function editEmployee(id) {
  const employee = window.db.employees.find((item) => item.id === id);
  if (!employee) {
    return;
  }

  $("employeeEditId").value = String(employee.id);
  $("empId").value = employee.employeeId;
  $("empEmail").value = getAccountEmailForEmployee(employee.userId);
  $("empPosition").value = employee.position;
  $("empDept").value = String(employee.deptId);
  $("empHireDate").value = employee.hireDate || "";
  $("employeeFormSection").hidden = false;
}

function deleteEmployee(id) {
  if (!window.confirm("Delete this employee?")) {
    return;
  }

  window.db.employees = window.db.employees.filter((item) => item.id !== id);
  saveToStorage();
  showToast("Employee deleted.", "success");
  renderEmployeesList();
}

function renderRequestsList() {
  if (!currentUser) {
    return;
  }

  const requests = (window.db.requests || []).filter((item) => item.employeeEmail === currentUser.email);
  $("requestsList").innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Items</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${
            requests.length === 0
              ? "<tr><td colspan='4'>You have no requests yet.</td></tr>"
              : requests.map((request) => {
                  const badgeClass =
                    request.status === "Approved"
                      ? "badge-success"
                      : request.status === "Rejected"
                        ? "badge-danger"
                        : "badge-warning";
                  const items = request.items.map((item) => `${item.name} (${item.qty})`).join(", ");
                  return `
                    <tr>
                      <td>${request.type}</td>
                      <td>${items || "-"}</td>
                      <td><span class="badge ${badgeClass}">${request.status}</span></td>
                      <td>${request.date}</td>
                    </tr>
                  `;
                }).join("")
          }
        </tbody>
      </table>
    </div>
    ${requests.length === 0 ? '<button class="btn btn-success" id="createRequestBtn" type="button">Create One</button>' : ""}
  `;

  $("createRequestBtn")?.addEventListener("click", () => {
    $("newRequestModal").classList.add("open");
  });
}

function addRequestItemRow() {
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `
    <input type="text" placeholder="Item name" class="item-name">
    <input type="number" placeholder="Qty" class="item-qty" value="1" min="1">
    <button type="button" class="btn-icon btn-add-item">+</button>
    <button type="button" class="btn-icon btn-remove-item">×</button>
  `;
  $("requestItems").appendChild(row);
}

document.addEventListener("DOMContentLoaded", () => {
  loadFromStorage();
  initAuthFromStorage();

  if (!window.location.hash) {
    navigateTo("#/");
  }
  handleRouting();
  window.addEventListener("hashchange", handleRouting);

  $("registerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const firstName = $("regFirstName").value.trim();
    const lastName = $("regLastName").value.trim();
    const email = $("regEmail").value.trim().toLowerCase();
    const password = $("regPassword").value;

    if (password.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    if (window.db.accounts.find((item) => item.email === email)) {
      showToast("Email is already registered.", "error");
      return;
    }

    window.db.accounts.push({
      id: window.db.nextId.account++,
      firstName,
      lastName,
      email,
      password,
      role: "User",
      verified: false,
    });

    saveToStorage();
    sessionStorage.setItem("unverified_email", email);
    showToast("Registration successful. Please verify your email.", "success");
    navigateTo("#/verify-email");
  });

  $("simulateVerifyBtn").addEventListener("click", () => {
    const email = sessionStorage.getItem("unverified_email");
    if (!email) {
      navigateTo("#/register");
      return;
    }

    const account = window.db.accounts.find((item) => item.email === email);
    if (account) {
      account.verified = true;
      saveToStorage();
    }

    sessionStorage.removeItem("unverified_email");
    sessionStorage.setItem("emailVerified", "1");
    showToast("Email verified successfully.", "success");
    navigateTo("#/login");
  });

  $("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = $("loginEmail").value.trim().toLowerCase();
    const password = $("loginPassword").value;
    const account = window.db.accounts.find((item) => item.email === email && item.password === password);

    if (!account) {
      showToast("Invalid email or password.", "error");
      return;
    }

    if (!account.verified) {
      sessionStorage.setItem("unverified_email", account.email);
      showToast("Please verify your email first.", "warning");
      navigateTo("#/verify-email");
      return;
    }

    setAuthState(true, account);
    showToast("Login successful.", "success");
    navigateTo("#/profile");
  });

  $("logoutLink").addEventListener("click", (event) => {
    event.preventDefault();
    setAuthState(false);
    navigateTo("#/");
    showToast("Logged out.", "info");
  });

  $("addAccountBtn").addEventListener("click", () => {
    $("accountForm").reset();
    $("accountId").value = "";
    $("accountFormSection").hidden = false;
  });

  $("cancelAccountBtn").addEventListener("click", () => {
    $("accountFormSection").hidden = true;
  });

  $("accountForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = $("accountId").value;
    const firstName = $("accFirstName").value.trim();
    const lastName = $("accLastName").value.trim();
    const email = $("accEmail").value.trim().toLowerCase();
    const password = $("accPassword").value;
    const role = $("accRole").value;
    const verified = $("accVerified").checked;

    if (window.db.accounts.find((item) => item.email === email && String(item.id) !== id)) {
      showToast("Email already in use.", "error");
      return;
    }

    if (id) {
      const account = window.db.accounts.find((item) => item.id === Number(id));
      if (!account) {
        return;
      }
      account.firstName = firstName;
      account.lastName = lastName;
      account.email = email;
      if (password) {
        account.password = password;
      }
      account.role = role;
      account.verified = verified;
      if (currentUser?.id === account.id) {
        setAuthState(true, account);
      }
    } else {
      if (password.length < 6) {
        showToast("Password must be at least 6 characters.", "error");
        return;
      }
      window.db.accounts.push({
        id: window.db.nextId.account++,
        firstName,
        lastName,
        email,
        password,
        role,
        verified,
      });
    }

    saveToStorage();
    $("accountFormSection").hidden = true;
    showToast("Account saved.", "success");
    renderAccountsList();
  });

  $("addDeptBtn").addEventListener("click", () => {
    const name = window.prompt("Department name:");
    if (!name || !name.trim()) {
      return;
    }
    const description = window.prompt("Description (optional):") || "";
    window.db.departments.push({
      id: window.db.nextId.department++,
      name: name.trim(),
      description: description.trim(),
    });
    saveToStorage();
    showToast("Department added.", "success");
    renderDepartmentsList();
    renderEmployeesList();
  });

  $("addEmployeeBtn").addEventListener("click", () => {
    $("employeeForm").reset();
    $("employeeEditId").value = "";
    renderEmployeesList();
    $("employeeFormSection").hidden = false;
  });

  $("cancelEmployeeBtn").addEventListener("click", () => {
    $("employeeFormSection").hidden = true;
  });

  $("employeeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const editId = $("employeeEditId").value;
    const employeeId = $("empId").value.trim();
    const email = $("empEmail").value.trim().toLowerCase();
    const position = $("empPosition").value.trim();
    const deptId = Number($("empDept").value);
    const hireDate = $("empHireDate").value || null;

    const account = window.db.accounts.find((item) => item.email === email);
    if (!account) {
      showToast("No account found with that email.", "error");
      return;
    }

    if (editId) {
      const employee = window.db.employees.find((item) => item.id === Number(editId));
      if (!employee) {
        return;
      }
      employee.employeeId = employeeId;
      employee.userId = account.id;
      employee.position = position;
      employee.deptId = deptId;
      employee.hireDate = hireDate;
    } else {
      window.db.employees.push({
        id: window.db.nextId.employee++,
        employeeId,
        userId: account.id,
        position,
        deptId,
        hireDate,
      });
    }

    saveToStorage();
    $("employeeFormSection").hidden = true;
    showToast("Employee saved.", "success");
    renderEmployeesList();
  });

  $("newRequestBtn").addEventListener("click", () => {
    $("newRequestModal").classList.add("open");
  });

  $("closeRequestModal").addEventListener("click", () => {
    $("newRequestModal").classList.remove("open");
  });

  $("newRequestModal").addEventListener("click", (event) => {
    if (event.target.id === "newRequestModal") {
      $("newRequestModal").classList.remove("open");
    }
  });

  $("addRequestItem").addEventListener("click", addRequestItemRow);

  $("requestItems").addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.classList.contains("btn-add-item")) {
      addRequestItemRow();
      return;
    }

    if (target.classList.contains("btn-remove-item")) {
      const rows = $("requestItems").querySelectorAll(".item-row");
      if (rows.length > 1) {
        target.closest(".item-row")?.remove();
      }
    }
  });

  $("newRequestForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser) {
      showToast("Please log in first.", "error");
      return;
    }

    const type = $("reqType").value;
    const rows = document.querySelectorAll("#requestItems .item-row");
    const items = [];

    rows.forEach((row) => {
      const name = row.querySelector(".item-name").value.trim();
      const qty = Number.parseInt(row.querySelector(".item-qty").value, 10) || 1;
      if (name) {
        items.push({ name, qty });
      }
    });

    if (items.length === 0) {
      showToast("Add at least one item.", "error");
      return;
    }

    window.db.requests.push({
      id: window.db.nextId.request++,
      type,
      items,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
      employeeEmail: currentUser.email,
    });

    saveToStorage();
    $("newRequestModal").classList.remove("open");
    $("requestItems").innerHTML = `
      <div class="item-row">
        <input type="text" placeholder="Item name" class="item-name">
        <input type="number" placeholder="Qty" class="item-qty" value="1" min="1">
        <button type="button" class="btn-icon btn-add-item">+</button>
        <button type="button" class="btn-icon btn-remove-item">×</button>
      </div>
    `;
    showToast("Request submitted.", "success");
    renderRequestsList();
  });

  $("dropdownTrigger").addEventListener("click", (event) => {
    event.stopPropagation();
    $("dropdownMenu").classList.toggle("open");
  });

  document.addEventListener("click", () => {
    $("dropdownMenu").classList.remove("open");
  });

  $("dropdownMenu").addEventListener("click", (event) => {
    event.stopPropagation();
  });
});
