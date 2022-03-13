# Standard library imports
import csv

# Third library imports
import matplotlib.pyplot as plt
import numpy as np

modes = ["TRA2", "TDRA2", "ARA2"]
bitsizes = [512, 1024]
n_dealers = [2, 3, 4, 5]
n_guards = [3, 5, 6, 8]
#labels = ["2 Deal/3 Guards", "3 Dealers/5 Guards", "4 Dealers/6 Guards", "5 Dealers/8 Guards"]
times = ["GetToken", "GetAccess", "Total"]

for m in modes:
    # 512 bits
    token_512 = []
    token_std_512 = []
    access_512 = []
    access_std_512 = []
    total_512 = []
    total_std_512 = []
    # 1024 bits
    token_1024 = []
    token_std_1024 = []
    access_1024 = []
    access_std_1024 = []
    total_1024 = []
    total_std_1024 = []
    labels = ["2D / 3G", "3D / 5G\n                                 Configuration", "4D / 6G", "5D / 8G"]
    for b in bitsizes:
        for i in range(4):
            if m == "TRA2":
                labels = ["1D / 3G", "1D / 5G\n                                 Configuration", "1D / 6G", "1D / 8G"]
                name = "./data/times_dealers_1_guards_" + str(n_guards[i]) + "_bitsize_" + str(b) + "_mode_" + m + ".csv"
            else:
                name = "./data/times_dealers_" + str(n_dealers[i]) + "_guards_" + str(n_guards[i]) + "_bitsize_" + str(b) + "_mode_" + m + ".csv"
            # Read csv files:
            with open(name, mode ='r') as file:
                # reading the CSV file
                csvFile = list(csv.reader(file, delimiter=","))
                # Get values
                values = csvFile[1]
            if b == 512:
                token_512.append(float(values[0]))
                token_std_512.append(float(values[1]))
                access_512.append(float(values[2]))
                access_std_512.append(float(values[3]))
                total_512.append(float(values[4]) - float(values[0]) - float(values[2]))
                total_std_512.append(float(values[5]))
            else:
                token_1024.append(float(values[0]))
                token_std_1024.append(float(values[1]))
                access_1024.append(float(values[2]))
                access_std_1024.append(float(values[3]))
                total_1024.append(float(values[4]) - float(values[0]) - float(values[2]))
                total_std_1024.append(float(values[5]))

        

    # Plot parameters
    x = np.arange(len(labels))  # the label locations
    width = 0.35  # the width of the bars    
    bottom_total_512 = [x + y for x, y in zip(token_512, access_512)]
    bottom_total_1024 = [x + y for x, y in zip(token_1024, access_1024)]

    fig, ax = plt.subplots()
    #fig.subplots_adjust(bottom=0.75)
    #twin.set_xlabel("Number of bits")
    #p = twin.plot([0, 1, 2], [0, 1, 2], )

    rects1 = ax.bar(x - width/2, token_512, width, yerr=token_std_512, label='GetToken', hatch='..', color='w', alpha=0.3, linewidth=0.1, edgecolor='black', ecolor='black', capsize=3)
    rects2 = ax.bar(x + width/2, token_1024, width, yerr=token_std_1024, label='GetToken', hatch='..', color='w',  alpha=0.3, linewidth=0.1, edgecolor='black', ecolor='black', capsize=3)

    rects3 = ax.bar(x - width/2, access_512, width, yerr=access_std_512, bottom=token_512, label='GetAccess', hatch='o', color='w', linewidth=0.1, edgecolor='black', alpha=0.3, ecolor='black', capsize=3)
    rects4 = ax.bar(x + width/2, access_1024, width, yerr=access_std_1024, bottom=token_1024, label='GetAccess', hatch='o', color='w', linewidth=0.1, edgecolor='black',  alpha=0.3, ecolor='black', capsize=3)

    rects5 = ax.bar(x - width/2, total_512, width, bottom=bottom_total_512, label='Total', hatch='//', color='w', linewidth=0.1, edgecolor='black', alpha=0.3, ecolor='black') # yerr=total_std_512, capsize=3
    rects6 = ax.bar(x + width/2, total_1024, width, bottom=bottom_total_1024, label='Total', hatch='//', color='w', linewidth=0.1, edgecolor='black', alpha=0.3, ecolor='black') #yerr=total_std_1024, capsize=3


    # Add some text for labels, title and custom x-axis tick labels, etc.
    ax.set_ylabel('Time (ms)')
    #title = 'Times by bitsize, parties and actions in '+ m + ' protocol.'
    #plt.title(title, fontsize=14, fontweight='bold')
    ax.set_xticks(x, labels)
    twin = ax.twiny()
    twin.set_xlim(0,4)
    twin.set_xlabel("Bitsize of operations")
    twin.set
    #twin.spines.bottom.set_position(("outward", 20))
    twin.set_xticks(x + width*1.5, ["512b   1024b", "512b     1024b", "512b     1024b", "512b     1024b"])
    ax.legend([rects1, rects3, rects5], ["Get Token", "Get Access", "Communication Time"], loc="upper left")

    #ax.bar_label(rects1, label_type='center', padding=-50)
    #ax.bar_label(rects2, label_type='center', padding=-50)
    #ax.bar_label(rects3, label_type='center')
    #ax.bar_label(rects4, label_type='center')
    #ax.bar_label(rects5, label_type='center', padding=-200)
    #ax.bar_label(rects6, label_type='center', padding=max(bottom_total_1024))

    fig.tight_layout()

    #plt.show()  

    # Save figure
    fig.savefig('./imgs/' + m + '_times.pdf', bbox_inches='tight')
