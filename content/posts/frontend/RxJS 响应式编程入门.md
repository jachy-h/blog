---
title: "RxJS 响应式编程入门"
date: 2024-01-11
categories: ["前端", "JavaScript", "踩虫记"]
draft: false
---

## 为什么需要 Observable

RxJS 补上了数据处理场景中的一块空白：**推送多个数据**。

这里把我们对数据的处理方式做了两个维度的分类：

| Type | SINGLE | MULTIPLE |
|------|--------|----------|
| Pull | Function | Iterator |
| Push | Promise | **Observable** |

### Pull 和 Push

**Pull** 就是我要的时候，就能要到。生产者无感。

- 每个 JS 函数调用都是在 Pull
- ES2015 的生成器（`function*`）弥补了“拉取多个值”的空白

**Push** 是生产者决定什么时候给，消费者等着接收。

- 典型例子是 `Promise`：调用 `then` 时，结果会被推给回调

从生产者和消费者的角度理解：

|      | 生产者 | 消费者 |
| ---- | ------ | ------ |
| Pull | 被动：等着要数据的时候再产生数据 | 主动：会决定啥时候去要数据 |
| Push | 主动：按照自己的节奏产生数据，然后推出去 | 被动：就等着数据（等回调） |

### 代码示例

**1. 拉取单个数据**

```typescript
function getNum() {
  return Math.floor(Math.random() * 10)
}

function singlePull() {
  const num = getNum()
  console.log(num, 'singlePull')
}
```

**2. 推送单个数据**

```typescript
function getNumPromise() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(getNum())
    }, 1000)
  })
}

function singlePush() {
  const promise = getNumPromise()
  promise.then(num => console.log(num, 'singlePush'))
}
```

**3. 拉取多个数据**

```typescript
function* getNumIterator() {
  let i = 0;
  while (i < 3) {
    i++;
    yield getNum();
  }
  return i;
}

function multiplePull() {
  const it = getNumIterator()
  while (true) {
    const { value, done } = it.next()
    if (done) break
    console.log(value, 'multiplePull')
  }
}
```

**4. 推送多个数据**

```typescript
function getNumObservable() {
  return new Observable(subscriber => {
    subscriber.next(getNum())
    subscriber.next(getNum())
    subscriber.next(getNum())
    setTimeout(() => {
      subscriber.next(getNum())
      subscriber.complete()
    }, 200)
  })
}

function multiplePush() {
  const ob = getNumObservable()
  ob.subscribe(val => {
    console.log(val, 'multiplePush')
  })
}
```

## 核心概念

| 英文 | 中文 | 描述 |
|------|------|------|
| Observable | 可观察对象 | 可调用的未来值或事件的集合 |
| Observer | 观察者 | 知道如何去监听由 Observable 提供的值 |
| Subscription | 订阅 | Observable 的执行，主要用于取消 Observable 的执行 |
| Operators | 操作符 | 纯函数，如 map, filter, concat, flatmap 等处理集合 |
| Subject | 主体 | 相当于 EventEmitter，是将多值或事件多路推送给多个 Observer 的唯一方式 |
| Scheduler | 调度器 | 用来控制并发，中央集权的调度员 |

### 个人理解

- **Observable**: 核心集合对象。会（在未来）产生值和事件。
- **Observer**: 对 Observable 产生的值和事件的处理函数。
- **Subscription**: 代表 Observable 的执行实例，可用于结束 Observable。
- **Operators**: 操作符，一系列无副作用函数。
- **Subject**: 唯一的多播（multicasting）方式，可多播到多个 Observer。
- **Scheduler**: 控制并发，类似于一个共用的锁。

## Observable 的使用

### 创建 Observable

**方式一：new 一个**

```typescript
const ob = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.complete()
})
```

**方式二：使用操作符**

```typescript
of(1, 2, 3)
from([1, 2, 3])
interval(200)
```

### 订阅 Observable

```typescript
of(1,2,3).subscribe(val => {
  console.log(val, 'of')
})
```

### 取消订阅

```typescript
const subscription = interval(200).subscribe(val => {
  console.log(val, 'interval');
})
setTimeout(() => subscription.unsubscribe(), 1000)
```

### Observable 的执行时机

**重要：Observable 是在被 subscribe 了才执行的。**

这是理解“多播”与“单播”的关键点：

```js
let n = 0;
function getNum() {
  return n++;
}

const ob = new Observable(subscriber => {
  subscriber.next(getNum());
})

console.log(n) // 0

ob.subscribe(val => console.log(val, 'unicast')); // 1
```

参考：[RxJS Official - Executing Observables](https://rxjs.dev/guide/observable#executing-observables)

## Observer

> Observer 是一个消费者，消费的是 Observable 中流转的值。是一个最多有 3 个回调函数的对象。

```typescript
const observer = {
  next: x => console.log('Observer got a next value: ' + x),
  error: err => console.error('Observer got an error: ' + err),
  complete: () => console.log('Observer got a complete notification'),
}
```

注：回调可以省略。

使用示例：

```typescript
const ob = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.next(3)	
  subscriber.complete()
})
ob.subscribe(observer)
```

## Subject 多播 vs 单播

> RxJS Subject 是一个特殊类型的 Observable，核心点就是它是**多播**（multicast）的。普通的 Observable 是**单播**的（unicast）。

```js
const { Observable, Subject } = require("rxjs");

let n = 0;
function getNum() {
  return n++;
}

// 单播：每次订阅都会重新执行
const unicastObservable = new Observable(observer => {
  observer.next(getNum());
})

unicastObservable.subscribe(val => console.log(val, 'unicast')); // 0
unicastObservable.subscribe(val => console.log(val, 'unicast')); // 1

// 多播：多次订阅共享一次计算结果
const multicastObservable = new Subject();
setTimeout(() => {
  multicastObservable.next(getNum());
}, 0);

multicastObservable.subscribe(val => console.log(val, 'multicast')); // 2
multicastObservable.subscribe(val => console.log(val, 'multicast')); // 2
```

- **单播（unicast）**: 每订阅（subscribe）一次，就执行了一次
- **多播（multicast）**: 多次订阅，共享的一次计算结果

## Operators 操作符

RxJS 有两类操作符：**Pipeable Operators** 和 **Creation Operators**

### Creation Operators

可以理解为生成新 Observable 的独立函数。比如 `of(1,2,3)` 会生成一个 Observable，依次发出 1、2、3。

### Pipeable Operators

本质上就是一个纯函数，输入 Observable，输出新的 Observable。

```typescript
const { Observable, pipe, filter } = require('rxjs')

const observable = new Observable(observer => {
  observer.next(1)
  observer.next(2)
  observer.next(3)
  observer.next(4)
})

// 通过 pipe 构建自己的 operator
function onlyEven() {
  return pipe(
    filter((value) => value % 2 === 0)
  )
}

observable.pipe(
  onlyEven()
).subscribe(v => console.log(v)) // 2, 4
```

参考：[RxJS Official - Operators](https://rxjs.dev/guide/operators)

## Subscription

> Subscription 是一个对象，表示一次性资源，常作为一个 Observable 的执行器。有一个重要的方法是 `unsubscribe` 用于取消订阅。

本质上就是一个 `Observable` 的执行对象，保存着一个取消订阅的方法。

```typescript
const { interval } = require('rxjs');

const obab = interval(200)
const subscription = obab.subscribe(val => console.log(val, 'interval'))

setTimeout(() => {
  subscription.unsubscribe()
}, 2000);
```

## Scheduler

> Scheduler 负责控制 subscription 的开始和数据的传输。

涉及知识点：JS 执行机制

参考：
- [RxJS: Scheduler](https://rxjs.dev/guide/scheduler)
- [RxJS: 认识 Scheduler](https://fullstackladder.dev/blog/2020/10/19/mastering-rxjs-34-introduce-scheduler-of-rxjs/)

## API 速查

### `interval(period: number, scheduler)`

隔 period 毫秒产生一个递增数字。

```typescript
interval(200) // 每 200ms 发出一个递增数字
```

---

**总结**：RxJS 的核心是 Observable。理解 Pull/Push、单播/多播和操作符的用法，是使用它的基础。
