import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

df_lac_salaries = pd.read_csv("./datasets/la_county/la_county_employee_salaries.csv")

plt.plot(df_lac_salaries["Base Earnings"])
plt.show()