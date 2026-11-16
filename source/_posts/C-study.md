---
title: C 语言内容整理
date: 2026-11-16 23:00:00
tags: [C语言, 嵌入式]
categories: [嵌入式学习]
---
> 关键字： 指针 内存管理 输入输出 宏 位运算

**本文是一篇学习笔记，仅供参考。部分内容由 DeepSeek 后期协助整理，如果有 bug 欢迎批评指正，也欢迎大家完善这个初步的整理**

**在这里对本文参考的许多文章表示感谢：中国矿业大学 CUBOT 战队的相关文档、《C Primer Plus》 和 CSDN上的帖子等资料**

---

## 1. C 语言从编写到执行经历的阶段

### 预处理 → 编译 → 汇编 → 链接

1. 预处理：宏定义展开、头文件展开、条件编译等，同时将代码中的注释删除，这里并不会检查语法
2. 编译：检查语法，将预处理后文件编译生成汇编文件
3. 汇编：将汇编文件生成目标文件（二进制文件）
4. 链接：C 语言写的程序是需要依赖各种库的，所以编译之后还需要把库链接到最终的可执行程序中去

现在我们就用 gcc 的命令选项来逐个剖析 gcc 过程。

### 预处理（Pre-processing）

在该阶段，编译器会把 C 源代码中 `#include` 的头文件如 stdio.h 添加进来。

- **参数**：`-E`
- **用法**：`gcc -E hello.c -o hello.i`
- **作用**：将 hello.c 预处理输出 hello.i 文件。

### 编译（Compiling）

第二步进行的是编译阶段，在这个阶段中，gcc 首先要检查代码的规范性、是否有语法错误等，以确定代码的实际要做的工作，在检查无误后，gcc 把代码翻译成汇编语言。

- **参数**：`-S`
- **用法**：`gcc -S hello.i -o hello.s`
- **作用**：将预处理输出文件 hello.i 汇编成 hello.s 文件。

### 汇编（Assembling）

汇编阶段是把编译阶段生成的 `.s` 文件转成二进制目标代码 `.o` 文件。

- **参数**：`-c`
- **用法**：`gcc -c hello.s -o hello.o`
- **作用**：将汇编输出文件 hello.s 编译输出 hello.o 文件。

### 链接（Link）

在成功编译之后，就进入了链接阶段。

- **用法**：`gcc hello.o -o hello`
- **作用**：将编译输出文件 hello.o 链接成最终可执行文件 hello。

那么 .o 到 .a 是什么步骤呢？

### 静态库生成

#### （1）创建静态库

由 .o 文件创建静态库。静态库文件名的命名规范是以 lib 为前缀，紧接着跟静态库名，扩展名为 .a。

例如：我们将创建的静态库名为 hello，则静态库文件名就是 libhello.a。

生成 .a 文件：

```bash
ar -cr libhello.a hello.o
```

#### （2）调用静态库

main.c

```c
#include <stdio.h>
void hello();
int main()
{
    hello();
    return 0;
}
```

编译 main.c，静态链接 libhello.a：

```bash
gcc main.c libhello.a -o main.out
```

#### （3）创建 so

由 .o 文件创建动态库文件。动态库文件名的命名规范和静态库文件名命名规范类似，也是在动态库名增加前缀 lib，只是它的文件扩展名为 .so。

例如：我们将创建的动态库名为 hello，则动态库文件名就是 libhello.so。

生成 so 文件：

```bash
gcc -shared -fPIC -o libhello.so hello.o
```

我们执行，发现报错了：

这是因为在生成 hello.o 时没有使用 `-fPIC` 选项，所以用下面的命令重新生成 hello.o，再执行一次生成 so 的命令。

```bash
gcc -c -fPIC hello.c
```

#### （4）调用 so

编译 main.c：

```bash
gcc -o main.out main.c -L. -lhello
```

执行，我们发现报错了：

原来是因为找不到动态库文件 libhello.so，程序在运行时，会在 /usr/lib 和 /lib 等目录中查找需要的动态库文件。

若找到，则载入动态库，否则会提示找不到动态库文件的错误并终止程序运行。

我们将文件 libhello.so 移动到目录 /usr/lib 中，再运行 main.out，已经可以正常调用 so 了。

移动到 /usr/lib 需要 root 权限。没有权限时，可以在当前目录执行 `export LD_LIBRARY_PATH=.:$LD_LIBRARY_PATH` 把当前目录临时加进动态库搜索路径，效果一样。

### 参考 makefile 教程

- [Makefile 教程 · 知乎专栏](https://zhuanlan.zhihu.com/p/350297509)
- [Makefile 教程 · 百度贴吧](https://tieba.baidu.com/p/591519800?red_tag=3422335486)
- [Makefile 教程 · 知乎专栏](https://zhuanlan.zhihu.com/p/618350718)

## 2. const、volatile、restrict 等关键字

### 2.1 const 关键字

#### C 语言与 C++ 中 const 的差异

| 特性         | C 语言                                                                                                                  | C++                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 本质         | 修饰的变量是**只读变量**（read-only variable），会分配内存。全局 const 落在只读数据段，用指针强行修改属未定义行为 | `const` 可修饰编译期常量（需结合 `constexpr`），编译器会做常量折叠。若未取地址可能不分配内存，通过指针修改会导致未定义行为 |
| 作用域       | 默认**文件作用域**（内部链接），跨文件访问需显式加 `extern`                                                     | 默认**块作用域**（局部可见），内部链接，类 / 命名空间场景无需显式 `extern` 即可正常工作                                |
| 数组长度支持 | C99 及之前，`const` 变量不能作为数组长度（非编译期常量）                                                              | `constexpr` 修饰的常量可作为数组长度，`const` 变量若初始化值为编译期常量也可支持                                           |

#### const 与指针的组合

- **`const int* p`**：`const` 在 `*` 左侧，修饰指针指向的内容，指针指向的值不可修改，但指针本身可以指向其他地址。
  示例：`int b = 0; const int a = 5; const int* p = &a; *p = 6; // 错误，不能改指向的内容。p = &b; // 正确，指针可以改指向`
- **`int* const p`**：`const` 在 `*` 右侧，修饰指针本身，指针地址不可修改，但指向的内容可以改。
  示例：`int a = 5; int b = 0; int* const p = &a; *p = 6; // 正确，可以改内容。p = &b; // 错误，不能改指针指向`
- **`const int* const p`**：`const` 同时修饰指针和指向的内容，指针地址和指向的值均不可修改。

### 2.2 volatile 关键字

#### 核心作用

告知编译器：**被修饰的变量可能被意外修改**（如硬件寄存器、中断服务程序、多线程共享变量），编译器不可对该变量的访问进行优化（需每次从内存重新读取，而非使用寄存器缓存值）。

#### 应用场景

1. **并行设备的硬件寄存器**：如状态寄存器（值可能被硬件自动更新，无需程序显式修改）。
   示例：`volatile unsigned int status_reg; // 每次读取需从寄存器地址重新获取值`
2. **中断服务子程序（ISR）访问的全局变量**：ISR 可能修改变量，主程序读取时需实时获取最新值。
   示例：`volatile int flag; // 主程序循环判断 flag，ISR 中修改 flag`
3. **多线程共享变量**：多个线程可能同时读写，需避免编译器优化导致的脏读。

#### 注意事项

- `volatile` 不能保证线程安全，仅防止编译器优化。线程安全需结合互斥锁（如信号量、自旋锁）。
- 可与 `const` 组合：如 `const volatile int* p;`（指向的内容只读且可能被意外修改，如只读状态寄存器）。

### 2.3 restrict 关键字

#### 核心作用

修饰指针时，告知编译器：**该指针是访问其指向内存区域的唯一方式**（无其他指针同时指向该内存），编译器可基于此进行更激进的优化（如缓存变量值、重排指令）。

#### 示例与注意事项

```c
#include <stdlib.h>

int *restrict restar = malloc(10 * sizeof(int)); // restar 是访问这块内存的唯一指针
int *par = restar; // 违反 restrict 约定，编译器可能给出错误结果
```

- 编译器不会检查用户是否遵循唯一访问限制，若违反（如多个 `restrict` 指针指向同一内存），会导致未定义行为。
- 仅用于指针，常见于内存操作函数（如 `memcpy`），提升编译器优化效率。

### 2.4 其他限定符

- **`_Atomic`（C11 新增）**：用于并发编程，保证变量的原子操作（如读写、自增），避免多线程竞争。需包含头文件 `<stdatomic.h>`，部分编译器为可选支持。

## 3. 函数参数的新写法（C99）

### 3.1 关键字在参数中的特殊用法

#### const/volatile 修饰参数数组

```c
// C99 允许在数组参数中使用 const/volatile，表明数组内容不可修改/可能被意外修改
void func(const int arr[10], volatile int buf[]);
```

- `const int arr[10]`：等价于 `const int* arr`，表明函数内不可修改数组内容。
- `volatile int buf[]`：等价于 `volatile int* buf`，表明数组内容可能被意外修改，需实时读取。

#### static 修饰参数数组

```c
// 告知编译器：实际参数是指向至少包含 20 个元素的数组的指针
void func(int arr[static 20]);
```

- 作用：帮助编译器优化代码（如假设数组长度足够，避免冗余检查），若传入数组长度不足，会导致未定义行为。

#### restrict 修饰参数指针

```c
// 表明 src 和 dest 指向的内存无重叠，编译器可优化内存拷贝逻辑
void memcpy(void* restrict dest, const void* restrict src, size_t len);
```

- 常见于内存操作、字符串处理函数，避免指针别名问题，提升拷贝效率。

## 4. 标准输入输出函数与字符串处理

### 4.1 格式化输入输出（scanf/printf）

#### printf 的 `*` 修饰符

用于**动态指定字段宽度或精度**，无需硬编码数值，灵活性更高。示例：

```c
int width = 5, precision = 3;
printf("%*.*f\n", width, precision, 3.14159); // 输出 "  3.142"（宽度 5，精度 3）
```

- `%*d`：`*` 对应参数指定字段宽度。
- `%.*f`：`*` 指定精度，宽度用数字写在 `%` 和 `.` 之间。

#### scanf 的 `*` 修饰符

用于**跳过一个输入数据**（不存储到变量），适用于忽略无关输入。示例：

```c
int a, b;
scanf("%d%*d%d", &a, &b); // 输入 "1 2 3"，跳过 2，a=1，b=3
```

### 4.2 字符串长度与内存大小（sizeof/strlen）

| 函数         | 作用                                        | 计算范围                                            | 返回值类型 |
| ------------ | ------------------------------------------- | --------------------------------------------------- | ---------- |
| `sizeof()` | 计算变量 / 类型占用的**总内存字节数** | 包含所有内存（如数组的未使用部分、字符串的 `\0`） | `size_t` |
| `strlen()` | 计算字符串的**有效长度**              | 从首字符到 `\0`（不包含 `\0`）                  | `size_t` |

示例：

```c
char str[10] = "hello";
printf("sizeof: %zu, strlen: %zu\n", sizeof(str), strlen(str)); // 输出 "sizeof: 10, strlen: 5"
```

### 4.3 整行输入输出函数

#### gets/puts（已弃用）

- **`gets(char* str)`**：读取整行输入，丢弃换行符，不检查数组长度，易导致栈溢出，C11 已移除。
- **`puts(const char* str)`**：输出字符串，自动在末尾添加 `\n`，需确保字符串以 `\0` 结尾（否则会出现乱码）。

#### fgets/fputs（推荐使用）

- **`char* fgets(char* str, int size, FILE* stream)`**：

  - 从 `stream`（如 `stdin` 表示键盘）读取字符，最多读取 `size-1` 个字符（预留 `\0` 空间）。
  - 若读取到换行符 `\n`，会将其存入 `str` 中（与 `gets` 不同）。
  - 返回值：成功返回 `str`，失败或到达文件尾返回 `NULL`。
- **`int fputs(const char* str, FILE* stream)`**：

  - 向 `stream`（如 `stdout` 表示命令行）输出字符串，**不自动添加 `\n`**（需手动在字符串中包含或用 `puts`）。
  - 返回值：成功返回非负值，失败返回 `EOF`。

示例（成对使用）：

```c
char buf[100];
fgets(buf, 100, stdin); // 读取整行，包含 \n
fputs(buf, stdout); // 输出整行，包含 \n，与输入格式一致
```

#### s_gets/gets_s（安全替代方案，VS 上用的较多）

- **`s_gets(char* str, int size)`**：非标准库函数，基于 `fgets` 实现，读取整行后将 `\n` 替换为 `\0`，若输入超长则清除缓冲区剩余字符。

示例：

```c
char* s_gets(char* str, int size) 
{
    char* ret = fgets(str, size, stdin);
    if (ret != NULL) 
    {
        char* newline = strchr(str, '\n');
        if (newline != NULL) *newline = '\0'; // 替换 \n 为 \0
        else while (getchar() != '\n'); // 清除缓冲区剩余字符
    }
    return ret;
}
```

- **`gets_s(char* str, rsize_t size)`**：C11 Annex K 扩展函数，读取整行并丢弃 `\n`，若输入超长则将 `str[0]` 设为 `\0` 并触发运行时错误。兼容性较差（如 GCC 不支持）。

### 4.4 字符串处理函数（string.h）

#### 字符串拼接（strcat/strncat）

- **`char* strcat(char* dest, const char* src)`**：将 `src` 拼接到 `dest` 末尾（覆盖 `dest` 的 `\0`），**无长度检查**，可能导致 `dest` 数组溢出。
- **`char* strncat(char* dest, const char* src, size_t n)`**：最多拼接 `n` 个字符，自动在末尾添加 `\0`，更安全。

示例：

```c
char dest[20] = "hello";
strncat(dest, " world", 5); // dest 变为 "hello worl"（拼接 5 个字符）
```

#### 字符串比较（strcmp/strncmp）

- **`int strcmp(const char* s1, const char* s2)`**：
  - 逐字符比较 ASCII 码，直到出现不同字符或 `\0`。
  - 返回值：`s1 < s2` 返回负数，`s1 == s2` 返回 0，`s1 > s2` 返回正数。
- **`int strncmp(const char* s1, const char* s2, size_t n)`**：仅比较前 `n` 个字符，适用于固定长度的字符串比较。

#### 字符串拷贝（strcpy/strncpy）

- **`char* strcpy(char* dest, const char* src)`**：将 `src` 拷贝到 `dest`（包含 `\0`），**无长度检查**，可能导致溢出。
- **`char* strncpy(char* dest, const char* src, size_t n)`**：
  - 最多拷贝 `n` 个字符，若 `src` 长度不足 `n`，则剩余部分用 `\0` 填充。若 `src` 长度超过 `n`，则不添加 `\0`（需手动处理）。

#### 类型与字符串转换

| 函数        | 功能                | 参数 / 返回值                                             | 注意事项                                                |
| ----------- | ------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| `sprintf` | 其他类型转字符串    | `int sprintf(char* str, const char* fmt, ...)`          | 可能导致缓冲区溢出，建议用 `snprintf`（指定最大长度） |
| `atoi`    | 字符串转 `int`    | `int atoi(const char* str)`                             | 转换失败返回 0，无错误提示                              |
| `atol`    | 字符串转 `long`   | `long atol(const char* str)`                            | 同上                                                    |
| `atof`    | 字符串转 `double` | `double atof(const char* str)`                          | 同上                                                    |
| `strtol`  | 字符串转 `long`   | `long strtol(const char* str, char** endptr, int base)` | `endptr` 指向转换终止位置，`base` 指定进制（2~36）  |
| `strtod`  | 字符串转 `double` | `double strtod(const char* str, char** endptr)`         | 同上，支持科学计数法                                    |

示例（`strtol` 用法）：

```c
char str[] = "123abc";
char* end;
long num = strtol(str, &end, 10); // num=123，end 指向 "abc"
```

## 5. size_t 类型

### 5.1 定义与特性

- **本质**：无符号整数类型，通常是 `typedef unsigned long` 或 `typedef unsigned long long`（取决于平台，32 位系统多为 4 字节，64 位系统多为 8 字节）。
- **用途**：用于表示内存大小、数组索引、函数返回的长度值（如 `sizeof`、`strlen`、`malloc` 的参数 / 返回值）。

### 5.2 使用注意事项

- **打印格式**：需使用 `%zu` 格式符（C99 标准），避免用 `%d`（可能导致类型不匹配）。
  示例：`printf("Size: %zu\n", sizeof(int));`
- **无符号特性**：`size_t` 是无符号类型，若与有符号类型（如 `int`）比较，需注意类型转换（避免负数被当作大正数）。
  示例：`for (size_t i = 5; i >= 0; i--); // 死循环，i 无符号，永远 >=0`

## 6. 缓冲区机制

### 6.1 缓冲类型

1. **完全缓冲 I/O**：缓冲区填满时才刷新（如文件操作），缓冲区大小通常为 512 字节或 4096 字节。
2. **行缓冲 I/O**：遇到换行符 `\n` 时刷新（如键盘输入、命令行输出），缓冲区大小通常为 1024 字节。
3. **无缓冲 I/O**：无缓冲区，数据立即传输（如 `stderr` 标准错误输出）。

### 6.2 缓冲区刷新时机

- 缓冲区填满时自动刷新。
- 调用 `fflush(FILE* stream)` 手动刷新（如 `fflush(stdout)` 刷新命令行输出缓冲区）。
- 程序正常退出时自动刷新所有缓冲区。

## 7. 数组与指针

### 7.1 数组初始化与变长数组（VLA）

#### 指定位置初始化（C99 及以后）

可直接为数组的特定索引赋值，未指定的元素默认置 0。示例：

```c
int arr[6] = {[5] = 212}; // arr[5] = 212，其余元素为 0
// arr2[0]=1, arr2[3]=5, arr2[4]=6，其余为 0
int arr2[10] = {1, [3] = 5, 6}; 
```

#### 变长数组（VLA，C99 特性，C11 变为可选）

- **定义**：数组长度由运行时变量指定，一旦创建，大小不可修改。

  示例：

```c
int n;
scanf("%d", &n);
int arr[n]; // 变长数组，长度为 n（运行时确定）
```

- **限制**：
  - 不能用 `static` 或 `extern` 修饰（需动态分配内存）。
  - 不能作为函数参数的默认值。
  - 兼容性较差（部分编译器如 MSVC 不支持），推荐用 `malloc` 动态分配内存替代。

### 7.2 数组与指针的关系

#### 数组名的特性

- 数组名的类型是数组，多数表达式里会退化成指向首元素的指针，且不能被赋值，如 `int arr[5]; arr++; // 错误，数组名不能自增`。
- 例外情况：
  - `sizeof(arr)`：数组名代表整个数组，返回数组总内存大小。
  - `&arr`：数组名代表整个数组，返回指向数组的指针（类型为 `int(*)[5]`）。

#### 函数参数中的数组与指针

在函数原型或定义中，数组参数会自动退化为指针：

```c
void func(int arr[10]); // 等价于 void func(int* arr);
void func(int arr[]);   // 等价于 void func(int* arr);
```

- 若需传递数组长度，需额外增加参数（如 `void func(int arr[], int len)`）。

### 7.3 数组指针与多维数组

#### 数组指针的定义与使用

- **定义**：指向数组的指针，格式为 `type (*ptr)[size]`（括号不可省略，否则为指针数组）。

  示例：

```c
 int arr[5] = {1,2,3,4,5};
 int (*ptr)[5] = &arr; // 指向包含 5 个 int 的数组
 printf("%d\n", (*ptr)[0]); // 输出 1，*ptr 是数组 arr
```

- **用途**：用于处理多维数组，尤其是作为函数参数传递多维数组时。

#### 多维数组的内存布局

多维数组在内存中是**连续存储**的，本质是数组的数组。示例（`int arr[2][3]`）：

| 内存地址 | 存储值 | 对应元素  |
| -------- | ------ | --------- |
| 0x1000   | 1      | arr[0][0] |
| 0x1004   | 2      | arr[0][1] |
| 0x1008   | 3      | arr[0][2] |
| 0x100C   | 4      | arr[1][0] |
| 0x1010   | 5      | arr[1][1] |
| 0x1014   | 6      | arr[1][2] |

- `arr`：类型为 `int(*)[3]`，指向第一行数组（`arr[0]`），`arr++` 指向第二行（地址增加 `3*sizeof(int)`）。
- `arr[0]`：类型为 `int*`，指向 `arr[0][0]`，`arr[0]++` 指向 `arr[0][1]`（地址增加 `sizeof(int)`）。

#### 多维数组作为函数参数

需指定除第一维外的所有维度（编译器需知道每行的元素个数）：

```c
// 正确：指定第二维为 3，arr 是指向包含 3 个 int 的数组的指针
void func(int arr[][3], int rows); 
// 等价写法：数组指针
void func(int (*arr)[3], int rows);
```

### 7.4 伸缩型数组成员（FAM，C99 特性）

#### 定义与用途

结构体的最后一个成员可以是未指定长度的数组（`type arr[]`），用于动态存储变长数据，避免额外的指针管理。示例：

```c
typedef struct 
{
    int len;
    char data[]; // 伸缩型数组成员，必须是最后一个成员
} Buffer;

// 动态分配内存：len=5，data 可存储 5 个 char
Buffer* buf = (Buffer*)malloc(sizeof(Buffer) + 5 * sizeof(char));
buf->len = 5;
strcpy(buf->data, "hello");
```

#### 限制

- 伸缩型数组成员必须是结构体的最后一个成员。
- 结构体不能包含多个伸缩型数组成员。
- 不能直接定义包含伸缩型数组成员的结构体变量（需动态分配内存）。

## 8. 复合字面量（C99 特性）

### 8.1 定义与语法

**复合字面量**是匿名的常量数组 / 结构体，创建时需同时使用，格式为 `(type){初始化列表}`。

- 数组复合字面量：`(int[3]){1,2,3}`、`(char[]){"hello"}`。
- 结构体复合字面量：`(struct Point){10, 20}`（需先定义 `struct Point {int x,y;}`）。

### 8.2 示例与作用域

```c
// 1. 数组复合字面量：指针指向匿名数组
int* ptr = (int[2]){10, 20}; 
printf("%d\n", ptr[0]); // 输出 10

// 2. 结构体复合字面量：作为函数参数
struct Point {int x, y;};
void print_point(struct Point p) 
{
    printf("(%d, %d)\n", p.x, p.y);
}
print_point((struct Point){100, 200}); // 输出 (100, 200)
```

- **作用域**：复合字面量具有块作用域，离开定义所在的 `{}` 后，内存可能被释放（不可再访问）。

## 9. 字符串与字符数组

### 9.1 基本概念

- **字符数组**：存储字符的数组，若末尾无 `\0`，则不是字符串（仅为字符序列）。
  示例：`char arr[5] = {'h','e','l','l','o'}; // 字符数组，非字符串`
- **字符串**：以 `\0` 结尾的字符数组，可被字符串处理函数（如 `strlen`、`strcpy`）识别。
  示例：`char str[6] = "hello"; // 字符串，末尾自动添加 \0`

### 9.2 字符串字面量

- **存储**：字符串字面量（如 `"hello"`）储存在静态内存区，程序运行期间始终存在，**默认只读**（修改会导致未定义行为）。
- **本质**：字符串字面量的类型是 `char[N]`，在表达式里退化成指向首字符的指针，如 `const char* ptr = "hello"; // ptr 指向 'h' 的地址`。

### 9.3 安全字符串函数（带 n 后缀）

为避免缓冲区溢出，推荐使用带 `n` 后缀的安全函数，指定最大操作长度：

| 函数        | 功能         | 安全版本                                                        |
| ----------- | ------------ | --------------------------------------------------------------- |
| `strcat`  | 字符串拼接   | `strncat(dest, src, n)`（最多拼接 `n` 个字符）              |
| `strcpy`  | 字符串拷贝   | `strncpy(dest, src, n)`（最多拷贝 `n` 个字符）              |
| `sprintf` | 格式化字符串 | `snprintf(str, size, fmt, ...)`（最多写入 `size-1` 个字符） |

## 10. main 函数与命令行参数

### 10.1 命令行参数的格式

```c
// argc：命令行参数个数（包含程序名），argv：指向参数字符串的指针数组
int main(int argc, char* argv[]) 
{
    for (int i = 0; i < argc; i++) 
    {
        printf("argv[%d]: %s\n", i, argv[i]);
    }
    return 0;
}
```

- **示例**：运行 `./program arg1 arg2`，`argc=3`，`argv[0]="./program"`，`argv[1]="arg1"`，`argv[2]="arg2"`。
- **argv 的末尾**：`argv[argc]` 为 `NULL`，可用于遍历参数（无需依赖 `argc`）。

### 10.2 常见用法

- 解析选项（如 `-h` 显示帮助、`-o output` 指定输出文件）。
- 传递输入文件路径、配置参数等。

## 11. 基本内存管理

### 11.1 动态内存分配函数（malloc/free）

#### malloc

- **功能**：从堆区分配指定大小的内存，未初始化（内存内容为随机值）。
- **原型**：`void* malloc(size_t size);`
- **参数**：`size` 为申请的内存字节数，若 `size=0`，返回值由编译器决定（可能为 `NULL` 或无效指针）。
- **返回值**：成功返回指向内存的指针，失败返回 `NULL`（需检查返回值）。

#### free

- **功能**：释放 `malloc`、`calloc`、`realloc` 分配的内存，避免内存泄漏。
- **原型**：`void free(void* ptr);`
- **注意事项**：
  - 仅能释放堆区内存，不可释放栈区内存（如局部变量）。
  - 不可重复释放同一指针（会导致内存错误）。
  - 释放后建议将指针置 `NULL`（避免野指针）。

#### 示例

```c
// 分配 20 字节（5 个 int）
int* ptr = (int*)malloc(5 * sizeof(int)); 
if (ptr == NULL) 
{ // 检查分配是否成功
    perror("malloc failed");
    exit(1);
}
for (int i = 0; i < 5; i++) 
{
    ptr[i] = i; // 初始化内存
}
free(ptr); // 释放内存
ptr = NULL; // 避免野指针
```

### 11.2 calloc 与 realloc

- **`void* calloc(size_t nmemb, size_t size)`**：

  - 功能：分配 `nmemb` 个大小为 `size` 的内存块，**自动初始化为 0**。
  - 示例：`int* ptr = (int*)calloc(5, sizeof(int)); // 5 个 int，初始化为 0`。
- **`void* realloc(void* ptr, size_t size)`**：

  - 功能：调整已分配内存的大小，若原内存不足，可能会分配新内存并拷贝原数据。
  - 示例：`ptr = (int*)realloc(ptr, 10 * sizeof(int)); // 扩大为 10 个 int`。
  - 注意：若 `ptr=NULL`，等价于 `malloc(size)`。若 `size=0`，等价于 `free(ptr)`。

## 12. 复合数据类型（struct、union、enum、typedef）

### 12.1 结构体（struct）

#### 基本用法

```c
// 定义结构体类型
typedef struct Student 
{
    char name[20];
    int age;
    float score;
} Student_t;

// 初始化结构体变量
Student_t s1 = {"Alice", 20, 95.5};
// 指定成员初始化（C99）
Student_t s2 = {.age = 19, .score = 88.0, .name = "Bob"}; 
```

#### 结构体指针与成员访问

- **`.` 运算符**：用于结构体变量访问成员，如 `s1.age = 21;`。
- **`->` 运算符**：用于结构体指针访问成员，如 `Student* p = &s1; p->score = 96.0;`。

#### 结构体嵌套

```c
typedef struct Address 
{
    char street[50];
    char city[20];
} Address;

typedef struct Student 
{
    char name[20];
    Address addr; // 嵌套结构体
} Student;

Student s = {"Charlie", {"Main St", "Beijing"}};
// 输出 "Charlie lives in Beijing"
printf("%s lives in %s\n", s.name, s.addr.city); 
```

#### 结构体对齐

- **默认对齐规则**：结构体每个成员的偏移量需为其自身对齐值的整数倍，结构体总大小需为成员中最大对齐值的整数倍（普通平台上 `char` 对齐 1、`int` 对齐 4、`double` 对齐 8）。

```c
struct A 
{
    char a; // 偏移 0（1 字节）
    int b;  // 偏移 4（需对齐到 4 字节，中间空 3 字节）
};
printf("%zu\n", sizeof(struct A)); // 输出 8（最大成员为 int，4 字节，总大小 8）
```

- **强制对齐**：使用 `__attribute__((packed))`（GCC）或 `#pragma pack(n)` 强制按 `n` 字节对齐，减少内存浪费。

示例：

```c
#pragma pack(1) // 按 1 字节对齐
struct A 
{
    char a;
    int b;
};
printf("%zu\n", sizeof(struct A)); // 输出 5（无间隙）
#pragma pack() // 恢复默认对齐
```

### 12.2 联合体（union）

#### 核心特性

- **内存共享**：所有成员共享同一块内存，联合体大小为最大成员的大小。
- **用途**：节省内存（如同一内存区域存储不同类型数据）、类型转换（通过不同成员访问同一内存）。

#### 示例

```c
typedef union Data 
{
    int i;
    float f;
    char c;
} Data;

Data d;
d.i = 0x12345678;
printf("f: %f\n", d.f); // 以 float 类型访问 0x12345678 对应的内存
printf("c: %c\n", d.c); // 以 char 类型访问最低字节（0x78，小端平台）
printf("Size: %zu\n", sizeof(d)); // 输出 4（最大成员为 int，4 字节）
```

### 12.3 枚举（enum）

#### 基本用法

```c
// 定义枚举类型，常量默认值为 0,1,2,...
enum Color 
{
    RED,    // 0
    GREEN,  // 1
    BLUE    // 2
};

// 自定义枚举值
enum Weekday 
{
    MON = 1,
    TUE,    // 2（自动递增）
    WED = 5,
    THU     // 6
};

enum Color c = GREEN;
printf("%d\n", c); // 输出 1
```

#### 用途

- 替代 `#define` 定义常量，可读性和调试信息更好。像是经典的 `GPIO_PIN_SET`，他确实等于 1，但直接写 1 看不出含义。要注意 C 的枚举不如 C++ 严格，`enum Color c = 1;` 在 C 里合法且默认不报警告，GCC 下会报 `-Wenum-conversion` 的是把 A 枚举的值赋给 B 枚举变量。
- 用于状态机、选项标记等场景（如 `enum State {IDLE, RUNNING, STOPPED};`）。

### 12.4 typedef

#### 核心作用

为已有类型创建别名，简化复杂类型声明，提高代码可读性和可移植性。

#### 常见用法

1. **简化基本类型**：

```c
typedef unsigned char uint8_t;
typedef long long int64_t;
uint8_t buf[10]; // 等价于 unsigned char buf[10];
```

2. **简化结构体 / 联合体 / 枚举**：

```c
typedef struct Point
{  
	int x, y;
} Point_t;
Point_t p = {10, 20}; // 无需写 struct Point
```

3. **简化指针类型**：

```c
typedef int* IntPtr;
IntPtr p1, p2;
// 等价于 int* p1, *p2;（避免写成 int *p1, p2; 的错误）
```

4. **简化函数指针类型**：

```c
// 定义函数指针类型：指向返回 int、参数为两个 int 的函数
typedef int (*FuncPtr)(int, int);
int add(int a, int b) { return a + b; }
FuncPtr p = add; // 函数指针赋值
printf("%d\n", p(2, 3)); // 输出 5
```

## 13. 指针、函数、数组的复杂声明

### 13.1 声明规则

1. **优先级**：`()`（函数）、`[]`（数组）优先级高于 `*`（指针），且从左向右结合。
2. **解析方法**：从变量名出发，先看优先级高的符号（`()`/`[]`），再看 `*`。

### 13.2 常见复杂声明示例

| 声明                    | 解析                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| `int* arr[10];`       | `arr` 是包含 10 个 `int*` 的数组（指针数组）                        |
| `int (*arr)[10];`     | `arr` 是指向包含 10 个 `int` 的数组的指针（数组指针）               |
| `int* (*func)(int);`  | `func` 是指向函数的指针，函数参数为 `int`，返回值为 `int*`        |
| `int (*arr[5])(int);` | `arr` 是包含 5 个函数指针的数组，函数参数为 `int`，返回值为 `int` |

### 13.3 函数指针的应用（回调函数）

函数指针可作为参数传递给其他函数，实现回调机制（如排序、事件处理）。示例（qsort 函数使用回调函数）：

```c
// 比较函数：用于 qsort 排序 int 数组
int compare(const void* a, const void* b) 
{
    return *(int*)a - *(int*)b; // 升序排序
}

int main() 
{
    int arr[] = {3,1,2};
    qsort(arr, 3, sizeof(int), compare); // 回调 compare 函数
    for (int i = 0; i < 3; i++) 
    {
        printf("%d ", arr[i]); // 输出 "1 2 3"
    }
    return 0;
}
```

## 14. 位字段（Bit-fields）

### 14.1 定义与用途

**位字段**是结构体的特殊成员，指定成员占用的二进制位数，用于节省内存（如硬件寄存器、协议帧）。

### 14.2 示例

```c
// 定义位字段结构体，总大小为 4 字节（unsigned int 大小）
struct Flags 
{
    unsigned int flag1 : 1; // 1 位（0 或 1）
    unsigned int flag2 : 2; // 2 位（0~3）
    unsigned int : 4;       // 4 位未使用（填充）
    unsigned int value : 5; // 5 位（0~31）
};

struct Flags f;
f.flag1 = 1;
f.flag2 = 2;
f.value = 10;
printf("Size: %zu\n", sizeof(f)); // 输出 4
```

### 14.3 注意事项

- 位字段的类型通常为 `unsigned int` 或 `int`（避免符号位问题）。
- 位字段不能跨字节（若剩余位数不足，会从下一字节开始）。
- 可移植性较差（不同编译器对位字段的存储顺序可能不同）。
- 不能用指针指向单个位字段，位字段共用存储单元，只是占据其中不同的二进制位。

## 15. C 预处理器与标准库

### 15.1 预处理器运算符

#### `##` 运算符（标记拼接）

仅在宏定义中使用，将两个预处理标记拼接为一个新标记。示例：

```c
#define CONCAT(a, b) a##b
int CONCAT(num, 123) = 456; // 等价于 int num123 = 456;
printf("%d\n", num123); // 输出 456
```

#### `#` 运算符（字符串化）

将宏参数转换为字符串字面量。示例：

```c
#define STR(x) #x
printf("%s\n", STR(hello)); // 输出 "hello"
printf("%s\n", STR(1+2));   // 输出 "1+2"（不计算表达式）
```

### 15.2 条件编译指令

#### 常用指令

- `#ifdef MACRO`：若 `MACRO` 已定义，则编译后续代码。
- `#ifndef MACRO`：若 `MACRO` 未定义，则编译后续代码（常用于防止头文件重复包含）。
- `#if 条件`：条件为真则编译后续代码（支持常量表达式）。
- `#elif 条件`：前一条件为假时，判断当前条件。
- `#else`：所有条件为假时编译。
- `#endif`：结束条件编译块。

#### 示例（防止头文件重复包含）

```c
// header.h
#ifndef HEADER_H
#define HEADER_H

// 头文件内容
void func();

#endif // HEADER_H
```

### 15.3 预定义宏

编译器预定义的宏，用于获取编译信息（如文件名、行号、编译时间）：

| 宏            | 功能                                | 示例输出          |
| ------------- | ----------------------------------- | ----------------- |
| `__FILE__`  | 当前源文件名                        | `"main.c"`      |
| `__LINE__`  | 当前代码行号                        | `10`            |
| `__func__`  | 当前函数名（C99+，隐式变量，非宏）  | `"main"`        |
| `__DATE__`  | 编译日期                            | `"Oct 28 2025"` |
| `__TIME__`  | 编译时间                            | `"15:30:45"`    |
| `__GNUC__`  | GCC 编译器版本（如 9 表示 GCC 9.x） | `9`             |
| `_WIN32`    | Windows 平台标识                    | `1`             |
| `__linux__` | Linux 平台标识                      | `1`             |

### 15.4 inline 关键字

#### 核心作用

建议编译器将函数代码内联到调用处，减少函数调用开销（如压栈、跳转），适用于短小的高频调用函数。

你写了inline，编译器不一定会真的内联。你不写inline，编译器有可能会内联，inline只是建议。

这个东西的实现类似define一样，直接把代码展开在对应位置，只不过这个是用函数的方式写的，实现逻辑是会减少一次调用函数的开销，用空间换时间。

#### 示例

```c
inline int add(int a, int b) 
{
    return a + b;
}

int main() 
{
    int sum = add(2, 3); // 编译器可能优化为 int sum = 2 + 3;
    return 0;
}
```

#### 注意事项

- `inline`会有问题，在想加inline的时候要好好评估一下。
- `inline` 只是建议，编译器可能忽略（如函数体过大）。
- C 语言中，`inline` 函数需在调用前定义（在头文件中定义），避免链接错误。原因：inline是在编译期实现的，他不能实现跨.c文件联动，所以他不能在.c inline，.h 声明，另一个.c中使用。

## 16. 带参宏与泛型编程

### 16.1 基本带参宏

带参宏无类型限制，编译时直接替换代码，适用于简单的通用逻辑（如计算最大值、平方）。示例：

```c
// 最大值宏：参数需加括号，避免优先级问题
#define MAX(a, b) ((a) > (b) ? (a) : (b))
// 平方宏
#define SQUARE(a) ((a) * (a))

int x = 5, y = 3;
// 输出 6（x 自增两次，y 自增一次，宏的副作用）
printf("MAX: %d\n", MAX(x++, y++)); 
printf("SQUARE: %d\n", SQUARE(2+3)); // 输出 25（(2+3)*(2+3)）
```

### 16.2 带参宏的副作用

宏参数若包含自增（`x++`）、自减（`x--`）等操作，会导致参数被多次计算，产生意外结果。示例：`MAX(x++, y++)` 展开为 `((x++) > (y++) ? (x++) : (y++))`，`x` 和 `y` 可能被自增多次。

### 16.3 复杂带参宏（泛型编程）

带参宏可将数据类型作为参数，实现简单的泛型逻辑（如 `container_of` 宏）。示例（Linux 内核中的 `container_of` 宏）：

```c
// 通过结构体成员地址获取结构体首地址
#define container_of(ptr, type, member) \
({                                                    \
    const typeof(((type*)0)->member) *__mptr = (ptr); \
    (type*)((char*)__mptr - offsetof(type, member));  \
})

// 也可以使用do while(0)的方式来实现宏的独立性。

typedef struct 
{
    int id;
    char name[20];
} Student;

Student s = {1, "Alice"};
char* name_ptr = s.name;
// 获取 s 的首地址
Student* p = container_of(name_ptr, Student, name); 
printf("ID: %d\n", p->id); // 输出 1
```

## 17. 嵌入式 C 特有的特性与技巧

### 17.1 extern "C"（C++ 兼容）

#### 核心作用

在 C++ 代码中调用 C 函数时，告知 C++ 编译器按 C 语言规则编译该函数（避免函数名修饰，保证链接正确）。

#### 示例

```c
// C 头文件（c_func.h）

#ifdef __cplusplus
extern "C" 
{
#endif

void c_func(); // C 函数声明

#ifdef __cplusplus
}
#endif

// C 实现文件（c_func.c）
#include "c_func.h"
void c_func() 
{
    // 函数实现
}

// C++ 调用文件（cpp_main.cpp）
#include "c_func.h"
int main() 
{
    c_func(); // 正确调用 C 函数
    return 0;
}
```

不过还有一个问题：C 语言调用 C++ 的函数呢，这个就存在相对难以解决的问题，在封装时要避免出现 C 调用 C++ 的代码。如果有，得单独搞一个接口层来对齐 C 和 C++。

### 17.2 绝对地址访问

嵌入式开发中，常需直接访问硬件寄存器的绝对地址，通过指针强制转换实现。示例：

```c
// 访问地址 0x67a9 的整型变量，赋值为 0xaa55
// 注意：0x67a9 来自经典的面试题，它不是 4 字节对齐的地址，ARM 上直接访问会触发 fault
*(volatile int* const)(0x67a9) = 0xaa55;

// 定义寄存器地址宏
#define UART_STATUS_REG (*(volatile unsigned int*)0x10000000)
#define UART_DATA_REG   (*(volatile unsigned int*)0x10000004)

// 读取 UART 状态寄存器
if (UART_STATUS_REG & 0x01) 
{ // 若数据就绪
    unsigned int data = UART_DATA_REG; // 读取数据
}
```

### 17.3 中断服务程序（ISR）

#### 基本要求

- 不能返回值，不能传递参数。
- 应尽量短小（避免阻塞中断），不调用可能导致睡眠的函数（如 `malloc`、`printf`）。
- 访问的全局变量需用 `volatile` 修饰（防止编译器优化）。

#### 示例

```c
volatile int flag = 0; // 中断标志，需用 volatile 修饰

// 中断服务程序（假设为 UART 接收中断）
void __interrupt uart_isr() 
{
    flag = 1; // 设置中断标志
    // 读取接收数据，清除中断标志
}

int main() 
{
    // 初始化中断（设置中断向量、使能中断）
    while (1) 
    {
        if (flag) 
        {
            // 处理中断事件
            flag = 0;
        }
    }
    return 0;
}
```

> 注意：`__interrupt` 不是标准 C 语法。Keil C51 用它声明中断号；Cortex-M 上一般直接写普通函数名（入口由中断向量表决定），GCC 则写 `__attribute__((interrupt))`。

### 17.4 位操作技巧

嵌入式开发中，位操作常用于硬件寄存器配置（如置位、清零、读取特定位）。示例：

```c
#define BIT(n) (1U << (n)) // 定义第 n 位为 1 的掩码

// 置位：第 3 位置 1
unsigned int reg = 0;
reg |= BIT(3); // reg = 0x08

// 清零：第 3 位清 0
reg &= ~BIT(3); // reg = 0x00

// 读取：判断第 3 位是否为 1
if (reg & BIT(3)) 
{
    // 第 3 位为 1
}

// 翻转：第 3 位翻转
reg ^= BIT(3);
```

## 18. 补充说明

1. 本文写的大多是 C 语言的进阶特性，基础语法（如变量定义、循环、分支）未详细展开，建议结合《C Primer Plus》等教材学习。
2. 嵌入式 C 开发需结合硬件特性（如寄存器、中断、DMA），建议参考具体芯片的数据手册和开发指南。
3. 代码可移植性是重要考量，避免依赖编译器特定的扩展（如 `__attribute__((packed))`），必要时通过条件编译适配不同平台。
4. 有些内容并未详细展开，等笔者到具体情况去实现的时候再来补充拓展。
5. 我们推荐大家使用C11这个版本进行开发，然后尽量避免使用变长数组，统一标准。

> 未完待续，下一波为cpp，以及结合嵌入式内的实现，如freertos。
>
> 再下一步为OpenOCD CMake 等等的实现
