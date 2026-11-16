---
title: STM32 —— CMSIS_OS2（一）运行机制与任务
date: 2026-11-16 23:30:00
tags: [STM32, FreeRTOS, CMSIS-RTOS2, 嵌入式]
categories: [嵌入式学习]
---
> 关键字： STM32 FreeRTOS CMSIS-RTOS2 任务 临界区 空闲任务 PendSV

这个笔记也是去年大概这个时候整理的，那个时候还是萌新，对这些了解也不多，当时大概学了这些代码，但是真正理解是在落实到工程上，在不同的地方要用不同的数据结构实现，运用中学习的远比这个笔记学的多的多。

先说 CMSIS_OS2 和正常的 FreeRTOS 有什么不同：

- CMSIS 相当于给 FreeRTOS 多了一层封装，不需要我们弄好硬件接口，但是我们也基本上只能用 CMSIS 给的 API。同时 CMSIS 也给这个代码做了类似 HAL 库的工作，给各种错误使用返回错误码
- 而其他使用 FreeRTOS 的工程，用的就是移植底层，使用的原生的 API 或者他们自己封装的 API，这样可能无保护

我现在开发stm32的时候，使用的FreeRTOS原生的API，而不是使用CMSIS的封装，因为这样反而是增大了阅读的困难，原生的API大家都认识。

## 基础概念

参考教程：[野火 STM32MP1 FreeRTOS 应用开发实战指南（基于 STM32MP157）](https://doc.embedfire.com/linux/stm32mp1/freertos/zh/latest/index.html)

| 模型       | 事件响应 | 事件处理 | 特点                       |
| ---------- | -------- | -------- | -------------------------- |
| 轮询系统   | 主程序   | 主程序   | 轮询响应事件，轮询处理事件 |
| 前后台系统 | 中断     | 主程序   | 实时响应事件，轮询处理事件 |
| 多任务系统 | 中断     | 任务     | 实时响应事件，实时处理事件 |

要区分任务上下文和中断上下文：

- 任务上下文是阻塞的，不会退出的（可以使用阻塞态的函数）
- 中断上下文是时间极短的，会退出的（不能使用阻塞态的任何函数）

两个东西之间使用，要严格遵守不同的地方的使用方法

个人认为使用 CubeMX 进行配置这些东西，很不方便，不如用户自己调用接口去定义任务，这样更方便管理，缺点就是看不到堆的使用情况，内存需要自己管理

## 开局的设置

### CubeMX相关

先看一眼 FreeRTOS 配置页里各个标签分别管什么：

![](/images/freertos/Pasted-image-20260127111241.png)

![](/images/freertos/Pasted-image-20260127193519.png)

![](/images/freertos/Pasted-image-20260127194625.png)

这个位置，可以开启多个任务同时访问片上外设的时候给外设上锁，4 是中断中可用，5 是中断中不可用。如果我们有了 FreeRTOS 的话，推荐使用 5，这些功能都应该在任务中被实现

（现在不推荐）

开启浮点运算单元

![](/images/freertos/image.png)

安全运行标准库函数 printf 等

![](/images/freertos/image-1.png)

如果有需要开启这俩回调函数，如果开启要去定义

![](/images/freertos/Pasted-image-20260126142427.png)

### 三个标志位（异常）

在 Cortex-M 架构中，FreeRTOS 为了任务启动和任务切换使用了三个异常：SVC、PendSV 和 SysTick：

SVC（系统服务调用，亦简称系统调用）用于任务启动，有些操作系统不允许应用程序直接访问硬件，而是通过提供一些系统服务函数，用户程序使用 SVC 发出对系统服务函数的呼叫请求，以这种方法调用它们来间接访问硬件，它就会产生一个 SVC 异常。

PendSV（可挂起系统调用）用于完成任务切换，它是可以像普通的中断一样被挂起的，它的最大特性是如果当前有优先级比它高的中断在运行，PendSV 会延迟执行，直到高优先级中断执行完毕，这样子产生的 PendSV 中断就不会打断其他中断的运行。

SysTick 用于产生系统节拍时钟，提供一个时间片，如果多个任务共享同一个优先级，则每次 SysTick 中断，下一个任务将获得一个时间片。

### 启动流程

先硬件初始化、RTOS 初始化、创建任务、定义任务、开启 RTOS 调度器

任务实体通常是一个不带返回值的无限循环的 C 函数，函数体必须有阻塞的情况出现，不然任务（如果优先权恰好是最高）会一直在 while 循环里面执行，其他任务没有执行的机会。

### 开局须了解API

#### osKernelInitialize 函数

CMSIS-RTOS 使用 osKernelInitialize 函数用来初始化 RTOS 内核状态，其函数定义如下

```c
osStatus_t osKernelInitialize (void) 
{
 osStatus_t stat;

 if (IS_IRQ()) // 如果在中断 直接报错
 {
     stat = osErrorISR;
 }
 else 
 {
     if (KernelState == osKernelInactive) // 动态分配部分 伏笔
     {
     #if defined(USE_FREERTOS_HEAP_5) && (HEAP_5_REGION_SETUP == 1)
         vPortDefineHeapRegions (configHEAP_5_REGIONS);
     #endif
     KernelState = osKernelReady;
     stat = osOK;
     } 
     else // 如果内核被激活也会报错
     {
     stat = osError;
     }
 }

 return (stat);
 }
```

#### osKernelStart 函数

osKernelStart 函数定义如下所示

```c
 osStatus_t osKernelStart (void) {
 osStatus_t stat;

 //判读是否在中断中执行osKernelStart函数
 if (IS_IRQ()) { 
     stat = osErrorISR;
 }
 else {
     if (KernelState == osKernelReady) {
     /* Ensure SVC priority is at the reset value */
     SVC_Setup();
     /* Change state to enable IRQ masking check */
     KernelState = osKernelRunning;   // 设置内核状态为运行态
     /* Start the kernel scheduler */
     vTaskStartScheduler();          //FreeRTOS启动任务调度器函数
     stat = osOK;
     } else {
     stat = osError;
     }
 }

 return (stat);
 }
```

创建好线程之后，使用这个 CMSIS 封装的函数，开启任务调度器 `vTaskStartScheduler()` 这个函数

系统为我们创建了一个任务：空闲任务：因为 FreeRTOS 一旦启动，就必须保证系统中每时每刻都有一个任务处于运行态（Running），并且空闲任务不可以被挂起与删除，空闲任务的优先级是最低的，以便系统中其他任务能随时抢占空闲任务的 CPU 使用权。

## 临界区

### 概念

临界区用一句话概括就是一段在执行的时候不能被中断的代码段。在 FreeRTOS 里面，这个临界段最常出现的就是对全局变量的操作。因为每个任务都有自己的栈和运行上下文，而全局变量是所有任务共享的同一份内存，谁先写、谁后写没有保证，就可能出现多个任务同时访问导致的竞态条件，所以要保证同一个时间有且只有一个线程/任务可以访问这个区域的资源

那么什么情况下临界区会被打断？一个是系统调度，还有一个就是外部中断。在 FreeRTOS，系统调度，最终也是产生 PendSV 中断，在 PendSV Handler 里面实现任务的切换，所以还是可以归结为中断。既然这样，FreeRTOS 对临界段的保护最终还是回到对中断的开和关的控制。

### 如何关中断：

| 名字    | 描述                                                                                                                                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BASEPRI | 这个寄存器最多有 9 位（由表达优先级的位数决定）。它定义了被屏蔽优先级的阈值。当它被设成某个值后，所有优先级号大于等于此值的中断都被关（优先级号越大，优先级越低）。但若被设成 0，则不关闭任何中断，0 也是缺省值。 |

在 FreeRTOS 中，对中断的开和关是通过操作 BASEPRI 寄存器来实现的，即大于等于 BASEPRI 的值的中断会被屏蔽，小于 BASEPRI 的值的中断则不会被屏蔽，不受 FreeRTOS 管理。用户可以设置 BASEPRI 的值来选择性的给一些非常紧急的中断留一条后路。

关中断，可以让我们这个临界区有绝对的执行权，进这个临界区了关中断，然后执行好，退出，开中断。

但是有很多函数可以用，需要用的时候去查

### 临界区的应用

e.g.

```c
/* 在中断场合，临界段可以嵌套 */
{
uint32_t ulReturn;
/* 进入临界段，临界段可以嵌套 */
    ulReturn = taskENTER_CRITICAL_FROM_ISR();

/* 临界段代码 */

/* 退出临界段 */
    taskEXIT_CRITICAL_FROM_ISR( ulReturn );
}

/* 在非中断场合，临界段不能嵌套 */
{
/* 进入临界段 */
    taskENTER_CRITICAL();

/* 临界段代码 */

/* 退出临界段*/
    taskEXIT_CRITICAL();
}
```

详见链接，有需要的时候去找：[野火教程 · 临界段保护](https://doc.embedfire.com/linux/stm32mp1/freertos/zh/latest/application/critical_protect.html#id1)

### 关于临界区保护

1. 仅任务间访问临界区 → 用互斥锁（Mutex）
2. 任务 + 中断 共同访问临界区 → 用二值信号量（中断安全版）+ 关中断 / 临界区宏（互斥锁是阻塞的，不能在中断里用）

## 任务

### 概念

FreeRTOS 中的任务是抢占式调度机制，高优先级的任务可打断低优先级任务，低优先级任务必须在高优先级任务阻塞或结束后才能得到调度。同时 FreeRTOS 也支持时间片轮转调度方式，只不过时间片的调度是不允许抢占任务的 CPU 使用权。

任务通常会运行在一个死循环中，也不会退出，如果一个任务不再需要，可以调用 RTOS 中的任务删除 API 函数接口显式地将其删除。

FreeRTOS 中提供的任务调度器是基于优先级的全抢占式调度：在系统中除了**中断处理函数**、**调度器上锁部分的代码**和**禁止中断的代码**是不可抢占的之外，系统的其他部分都是可以抢占的。系统理论上可以支持无数个优先级（0 ～ N，优先级数值越小的任务优先级越低，0 为最低优先级，分配给空闲任务使用，一般不建议用户来使用这个优先级）。

假如使能了 configUSE_PORT_OPTIMISED_TASK_SELECTION 这个宏（在 FreeRTOSConfig.h 文件定义，可在 STM32CubeIDE 中配置），在系统中，当有比当前任务优先级更高的任务就绪时，当前任务将立刻被换出，高优先级任务抢占处理器运行。CMSIS-RTOS 封装后的 FreeRTOS 优先级数目默认为 56。

### 任务状态迁移

![](/images/freertos/Pasted-image-20260127125840.png)

图1 **(1)**：创建任务→就绪态（Ready）：任务创建完成后进入就绪态，表明任务已准备就绪，随时可以运行，只等待调度器进行调度。

图1 **(2)**：就绪态→运行态（Running）：发生任务切换时，就绪列表中最高优先级的任务被执行，从而进入运行态。

图1 **(3)**：运行态→就绪态：有更高优先级任务创建或者恢复后，会发生任务调度，此刻就绪列表中最高优先级任务变为运行态，那么原先运行的任务由运行态变为就绪态，依然在就绪列表中，等待最高优先级的任务运行完毕继续运行原来的任务（此处可以看做是 CPU 使用权被更高优先级的任务抢占了）。

图1 **(4)**：运行态→阻塞态（Blocked）：正在运行的任务发生阻塞（挂起、延时、读信号量等待）时，该任务会从就绪列表中删除，任务状态由运行态变成阻塞态，然后发生任务切换，运行就绪列表中当前最高优先级任务。

图1 **(5)**：阻塞态→就绪态：阻塞的任务被恢复后（任务恢复、延时时间超时、读信号量超时或读到信号量等），此时被恢复的任务会被加入就绪列表，从而由阻塞态变成就绪态；如果此时被恢复任务的优先级高于正在运行任务的优先级，则会发生任务切换，将该任务将再次转换任务状态，由就绪态变成运行态。

图1 **(6)(7)(8)**：就绪态、阻塞态、运行态→挂起态（Suspended）：被挂起的任务得不到 CPU 的使用权，也不会参与调度，除非它从挂起态中解除。

图1 **(9)**：挂起态→就绪态：如果被恢复任务的优先级高于正在运行任务的优先级，则会发生任务切换，将该任务将再次转换任务状态，由就绪态变成运行态。

四种状态：

- 就绪（Ready）：该任务在就绪列表中，就绪的任务已经具备执行的能力，只等待调度器进行调度，新创建的任务会初始化为就绪态。
- 运行（Running）：该状态表明任务正在执行，此时它占用处理器，FreeRTOS 调度器选择运行的永远是处于最高优先级的就绪态任务，当任务被运行的一刻，它的任务状态就变成了运行态。
- 阻塞（Blocked）：如果任务当前正在等待某个时序或外部中断，我们就说这个任务处于阻塞状态，该任务不在就绪列表中。包含任务被挂起、任务被延时、任务正在等待信号量、读写队列或者等待读写事件等。
- 挂起态（Suspended）：处于挂起态的任务对调度器而言是不可见的，我们可以这么理解挂起态与阻塞态的区别，当任务有较长的时间不允许运行的时候，我们可以挂起任务，这样子调度器就不会管这个任务的任何信息，直到我们调用恢复任务的 API 函数；而任务处于阻塞态的时候，系统还需要判断阻塞态的任务是否超时，是否可以解除阻塞。

### 任务设计

FreeRTOS 中程序运行的上下文包括：

- 中断服务函数。
- 普通任务。
- 空闲任务。

#### 1. 中断服务函数：

中断服务函数是一种需要特别注意的上下文环境，**它运行在非任务的执行环境下，在这个上下文环境中不能使用挂起当前任务的操作，不允许调用任何会阻塞运行的 API 函数接口**。使用 CMSIS-RTOS 封装过的 FreeRTOS，都会判断是否在中断环境中运行，如果是则直接退出。另外需要注意的是，**中断服务程序最好保持精简短小，快进快出，一般在中断服务函数中只做标记事件的发生，然后通知任务，让对应任务去执行相关处理**，因为中断服务函数的优先级高于任何优先级的任务，**如果中断处理时间过长，将会导致整个系统的任务无法正常运行**。所以在设计的时候必须考虑中断的频率、中断的处理时间等重要因素，以便配合对应中断处理任务的工作。

#### 2. 任务：

任务看似没有什么限制程序执行的因素，似乎所有的操作都可以执行。但是做为一个优先级明确的实时系统，**如果一个任务中的程序出现了死循环操作（此处的死循环是指没有阻塞机制的任务循环体），那么比这个任务优先级低的任务都将无法执行**，当然也包括了空闲任务，因为死循环的时候，任务不会主动让出 CPU，低优先级的任务是不可能得到 CPU 的使用权的，而高优先级的任务就可以抢占 CPU。这个情况在实时操作系统中是必须注意的一点，所以在任务中不允许出现死循环。如果一个任务只有就绪态而无阻塞态，势必会影响到其他低优先级任务的执行，**所以在进行任务设计时，就应该保证任务在不活跃的时候，任务可以进入阻塞态以交出 CPU 使用权，这就需要我们自己明确知道什么情况下让任务进入阻塞态，保证低优先级任务可以正常运行**。在实际设计中，一般会将紧急的处理事件的任务优先级设置得高一些。

#### 3. 空闲任务：

空闲任务（idle 任务）是 FreeRTOS 系统中没有其他工作进行时自动进入的**系统任务**。因为处理器总是需要代码来执行——所以至少要有一个任务处于运行态。FreeRTOS 为了保证这一点，当调用 vTaskStartScheduler() 时，调度器会自动创建一个空闲任务，空闲任务是一个非常短小的循环。**用户可以通过空闲任务钩子方式，在空闲任务上钩入自己的功能函数。通常这个空闲任务钩子能够完成一些额外的特殊功能**，例如系统运行状态的指示，系统省电模式等。除了空闲任务钩子，FreeRTOS 系统还把空闲任务用于一些其他的功能，比如当系统删除一个任务或一个动态任务运行结束时，在执行删除任务的时候，并不会释放任务的内存空间，只会将任务添加到结束列表中，真正的系统资源回收工作在空闲任务完成，空闲任务是唯一一个不允许出现阻塞情况的任务，因为 FreeRTOS 需要保证系统永远都有一个可运行的任务。

对于空闲任务钩子上挂接的空闲钩子函数，它应该满足以下的条件：

- 永远不会挂起空闲任务；
- 不应该陷入死循环，需要留出部分时间用于系统处理系统资源回收。

#### 4. 任务的执行时间：

任务的执行时间一般是指两个方面，一是任务从开始到结束的时间，二是任务的周期。

| 任务 | 周期 / 单次运行耗时              | 优先级设置 | 抢占 Ta | Ta 响应要求 | 对 Ta 的影响               |
| ---- | -------------------------------- | ---------- | ------- | ----------- | -------------------------- |
| Ta   | 10ms（响应周期）/1ms（运行耗时） | 基准优先级 | -       | ≤10ms      | 基准：需在 10ms 内完成响应 |
| Tb   | 50ms/100us                       | 高于 Ta    | 100us   | ≤10ms      | 100us＜10ms，Ta 可按时响应 |
| Tc   | 100ms/20ms                       | 高于 Ta    | 20ms    | ≤10ms      | 20ms＞10ms，Ta 超时未响应  |

所以单看对 Ta 的影响：Tb 排在 Ta 前面没有太大问题，它一次只占用 100us，Ta 的响应延迟仍然远小于 10ms 的要求；Tc 却不能排在 Ta 前面，它一次占用 20ms，一压 Ta 就必然超时。优先级从高到低应该排成 Tb > Ta > Tc，也就是单次运行时间越短的任务，优先级排得越高。

所以在我们设计的时候，必须考虑任务的时间，一般来说处理时间更短的任务优先级应设置更高一些。

### 常用任务函数API

#### 如何创建任务 CubeMX

点击栏目

![](/images/freertos/Pasted-image-20260127173752.png)

- **Task Name**：用于设置线程名。
- **Priority**：用于设置线程优先级。
- **Stack Size(Words)**：用于设置线程栈大小。
- **Entry Function**：用于设置线程函数名。
- **Code Generation Option**：可选择以弱定义和外部声明的方式生成。（默认任务不能以外部声明，故而推荐只有默认任务用弱定义，其他的外部声明）
- **Parameter**：线程函数参数
- **Allocation**：选择使用动态内存分配的还是静态内存的方式创建线程。
- **Buffer Name**：当使用静态内存创建线程，使用的栈地址名。
- **Control Block Name**：当使用静态内存创建线程，创建的线程控制块变量名。

#### osThreadAttr_t结构体

CMSIS-RTOS 用它描述线程属性

```c
 //描述线程属性的结构体
 typedef struct {
     const char                   *name;   ///< 线程名
     uint32_t                 attr_bits;   ///< 在FreeRTOS内核中没有使用
     void                      *cb_mem;    ///< 控制块内存     这四个有一个未定义，就会触发动态内存分配
     uint32_t                   cb_size;   ///< 控制块大小     这四个有一个未定义，就会触发动态内存分配
     void                   *stack_mem;    ///< 栈地址        这四个有一个未定义，就会触发动态内存分配
     uint32_t                stack_size;   ///< 栈大小        这四个有一个未定义，就会触发动态内存分配
     osPriority_t              priority;   ///< 最初的线程优先级 (默认值: osPriorityNormal)
     TZ_ModuleId_t            tz_module;   ///< 在FreeRTOS内核中没有使用
     uint32_t                  reserved;   ///< 保留 (必须为0)
 } osThreadAttr_t;
```

#### osThreadNew函数

CMSIS-RTOS 使用 osThreadNew 函数用于创建线程，其函数原型如下

```c
//创建新线程  传入参数为：线程函数、线程参数、线程控制块
 osThreadId_t osThreadNew (osThreadFunc_t func, void *argument, const osThreadAttr_t *attr) {
 const char *name;
 uint32_t stack;
 TaskHandle_t hTask;
 UBaseType_t prio;
 int32_t mem;                        //标记创建线程方式(动态、静态)

 hTask = NULL;

 //判断是否在中断中使用该函数以及线程函数是否为空
 if (!IS_IRQ() && (func != NULL)) {
     stack = configMINIMAL_STACK_SIZE;               //默认线程栈大小为128
     prio  = (UBaseType_t)osPriorityNormal;  //默认线程优先级为24

     name = NULL;            //默认线程名为空
     mem  = -1;

     //线程控制块不为空
     if (attr != NULL) {

     //设置线程名
     if (attr->name != NULL) {
         name = attr->name;
     }

     //设置线程优先级
     if (attr->priority != osPriorityNone) {
         prio = (UBaseType_t)attr->priority;
     }

     //线程优先级出错判断
     if ((prio < osPriorityIdle) || (prio > osPriorityISR) || ((attr->attr_bits & osThreadJoinable) == osThreadJoinable)) {
         return (NULL);
     }

     //设置栈大小
     if (attr->stack_size > 0U) {
         /* In FreeRTOS stack is not in bytes, but in sizeof(StackType_t) which is 4 on ARM ports.       */
         /* Stack size should be therefore 4 byte aligned in order to avoid division caused side effects */
         stack = attr->stack_size / sizeof(StackType_t);
     }

     //判断线程控制块创建线程的方式
     if ((attr->cb_mem    != NULL) && (attr->cb_size    >= sizeof(StaticTask_t)) &&
         (attr->stack_mem != NULL) && (attr->stack_size >  0U)) {
         mem = 1;
     }
     else {
         if ((attr->cb_mem == NULL) && (attr->cb_size == 0U) && (attr->stack_mem == NULL)) {
         mem = 0;
         }
     }
     }
     else {
     mem = 0;
     }

     //使用静态创建线程
     if (mem == 1) {
     hTask = xTaskCreateStatic ((TaskFunction_t)func, name, stack, argument, prio, (StackType_t  *)attr->stack_mem,
                                                                                     (StaticTask_t *)attr->cb_mem);
     }
     //使用动态创建线程
     else {
     if (mem == 0) {
         if (xTaskCreate ((TaskFunction_t)func, name, (uint16_t)stack, argument, prio, &hTask) != pdPASS) {
         hTask = NULL;
         }
     }
     }
 }
 //将使用FreeRTOS创建线程得到的线程id返回
 return ((osThreadId_t)hTask);
 }
```

**参数**：

- **func**：线程的函数入口
- **argument**：线程函数参数
- **attr**：osThreadAttr_t 结构体(线程控制块)

**返回值**：成功则返回线程 ID，失败返回 NULL。

当 attr 形参中的 cb_mem、cb_size、stack_mem、stack_size 四个成员中只要有一个成员为空则使用动态内存分配的形式创建线程，相反如果我们需要使用静态内存分配则需要对以上四个成员赋予正确的值。

#### osThreadGetId返回当前线程ID函数

```c
osThreadId_t osThreadGetId (void) {
osThreadId_t id;

   id = (osThreadId_t)xTaskGetCurrentTaskHandle();

   return (id);
}
```

返回正在执行任务的 ID

#### osThreadSuspend任务挂起函数

`osStatus_t osThreadSuspend (osThreadId_t thread_id)`

#### osThreadResume任务恢复函数

`osStatus_t osThreadResume (osThreadId_t thread_id)`

#### osDelay (uint32_t ticks)

延时函数

#### 任务删除函数

##### NO_RETURN void osThreadExit (void)

删除当前线程

##### osStatus_t osThreadTerminate (osThreadId_t thread_id)

删除指定线程 id 的线程

> 下一篇是任务间通信：消息队列、信号量、互斥量、事件、软件定时器和任务通知。
