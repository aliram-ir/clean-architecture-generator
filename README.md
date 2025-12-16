# Clean Architecture Generator

🚀 A VS Code extension to automatically scaffold **Clean Architecture–based .NET solutions** using real‑world, production‑ready best practices.

This extension enables you to generate a **fully structured Clean Architecture solution** and all **entity‑based components** (Repository, Service, DTO, Unit of Work, AutoMapper, Fluent Configuration) with **a single command**.

---

## ✨ Features

### 🏗 Solution Generation

* Generate a complete **Clean Architecture** solution
* Automatically creates the following layers:

  * **Domain**
  * **Application**
  * **Infrastructure**
  * **Shared**
  * **DI**

---

### 🧩 Entity‑Based Code Generation

By right‑clicking on an Entity file (`.cs`), the extension automatically generates:

* Repository **interface** and **implementation**
* **Unit of Work** synchronization (non‑destructive)
* DTOs:

  * Read
  * Create
  * Update
* Application **Service** with full CRUD logic
* **AutoMapper Profile**
* **Fluent API Configuration** (`IEntityTypeConfiguration<T>`)

> ⚠️ Base infrastructure templates are **never overwritten**.

---

### 🔁 Full CRUD Service Generation

Generated services include **production‑ready CRUD logic**:

* Uses **DTOs** instead of exposing domain entities
* Injects:

  * `IUnitOfWork`
  * `IMapper`
* Implements:

  * `GetByIdAsync`
  * `GetAllAsync`
  * `CreateAsync`
  * `UpdateAsync`
  * `DeleteAsync`

---

### 🧠 Smart Unit of Work Synchronization

* Automatically adds missing repositories to:

  * `IUnitOfWork`
  * `UnitOfWork` implementation
* Uses **lazy initialization**
* Prevents duplicate properties
* Safe to re‑run multiple times

---

### 🔧 AutoMapper Support

* Optional and configurable via VS Code settings
* Generates a **dedicated Profile per entity**
* Supports mappings:

  * Entity ↔ DTO
  * Create DTO → Entity
  * Update DTO → Entity

---

### 🧱 Fluent API Configuration

For every entity, a Fluent API configuration file is generated:

```
Infrastructure
└─ Persistence
   └─ Configurations
      └─ {Entity}Configuration.cs
```

* Automatically applied in `ApplicationDbContext`
* Keeps EF Core configuration clean and separated

---

## ⚙️ Configuration (VS Code Settings)

```json
{
  "cleanArchitectureGenerator.useAutoMapper": true,
  "cleanArchitectureGenerator.useMemoryCache": false,
  "cleanArchitectureGenerator.useAutoDI": true
}
```

---

## 🏛 Generated Architecture Structure

```
📦 Solution
 ┣ 📂 Domain
 ┃ ┣ 📂 Entities
 ┃ ┣ 📂 Interfaces
 ┃ ┃ ┣ 📂 Base
 ┃ ┃ ┗ 📂 Repositories
 ┃
 ┣ 📂 Application
 ┃ ┣ 📂 DTOs
 ┃ ┃ ┗ 📂 {EntityPlural}
 ┃ ┣ 📂 Interfaces
 ┃ ┃ ┗ 📂 Services
 ┃ ┣ 📂 Services
 ┃ ┣ 📂 Mappings
 ┃
 ┣ 📂 Infrastructure
 ┃ ┣ 📂 Persistence
 ┃ ┃ ┣ 📂 Contexts
 ┃ ┃ ┗ 📂 Configurations
 ┃ ┣ 📂 Repositories
 ┃ ┃ ┗ 📂 Base
 ┃
 ┣ 📂 DI
 ┃ ┗ 📂 Extensions
 ┗ 📂 Shared
```

---

## 🖱 How to Use

### 1️⃣ Create Solution

Open the Command Palette:

```
Clean Architecture: Create Solution
```

### 2️⃣ Generate from Entity

Right‑click on any Entity file (`.cs`):

```
Clean Architecture: Generate Repository + DTO + Service
```

✅ All layers and dependencies are generated and synchronized automatically.

---

## 🎯 Why This Extension?

* Enforces **Clean Architecture** boundaries
* Eliminates repetitive boilerplate code
* Uses proven enterprise patterns:

  * Unit of Work
  * Repository
  * DTO
  * AutoMapper
* Non‑destructive and safe to re‑run
* Ideal for **enterprise‑grade .NET projects**

---

## 📜 License

MIT License

---

## 👨‍💻 Author

**Ali Ramezani**

* GitHub: [https://github.com/aliram-ir](https://github.com/aliram-ir)
